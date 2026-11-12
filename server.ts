import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

interface AnalyzeLeadBody {
  lead?: {
    nome?: string;
    empresa?: string | null;
    segmento?: string | null;
    demanda?: string | null;
    volume?: string | null;
    urgencia?: string;
    sentimento?: string;
    nota?: number;
    resumo?: string | null;
    handoff?: boolean;
  };
  interacoes?: Array<{
    tipo: string;
    conteudo: string;
    created_at: string;
  }>;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/analyze-lead", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Chave GEMINI_API_KEY não configurada no servidor.",
    });
    return;
  }

  const body = (req.body || {}) as AnalyzeLeadBody;
  if (!body.lead) {
    res.status(400).json({ error: "Dados do lead são obrigatórios." });
    return;
  }

  const interacoes = Array.isArray(body.interacoes) ? body.interacoes : [];
  const timelineText =
    interacoes.length > 0
      ? interacoes
          .slice()
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          .map(
            (item) =>
              `[${item.created_at}] (${item.tipo}): ${item.conteudo}`
          )
          .join("\n")
      : "Sem interações registradas ainda.";

  const prompt = `Você é um analista comercial sênior da BuildAI (empresa brasileira de atendentes de IA no WhatsApp).
Releia os dados atuais do lead e todo o histórico de interações abaixo para sugerir uma atualização precisa e objetiva em português do Brasil.

Dados atuais do lead:
- Nome: ${body.lead.nome ?? "Não informado"}
- Empresa: ${body.lead.empresa ?? "Não informada"}
- Segmento atual: ${body.lead.segmento ?? "Não informado"}
- Demanda atual: ${body.lead.demanda ?? "Não informada"}
- Volume informado: ${body.lead.volume ?? "Não informado"}
- Urgência atual: ${body.lead.urgencia ?? "media"}
- Sentimento atual: ${body.lead.sentimento ?? "neutro"}
- Nota atual (0-10): ${body.lead.nota ?? 5}
- Handoff para humano: ${body.lead.handoff ? "Sim" : "Não"}
- Resumo atual: ${body.lead.resumo ?? "Sem resumo"}

Histórico cronológico de interações:
${timelineText}

Critérios para a nota (0 a 10):
- 8 a 10: fit claro, volume relevante, urgência alta, pediu proposta/reunião/humano ou sinal positivo forte.
- 5 a 7: interesse real, em qualificação, precisa de follow-up ou definição de prazo/orçamento.
- 0 a 4: curioso sem fit, fora de ICP, objeção forte de preço ou sentimento negativo.

Retorne apenas JSON válido no schema solicitado.`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "Você analisa conversas comerciais de WhatsApp em português do Brasil para o CRM BuildAI Leads. Seja direto, prático e fiel aos fatos das interações.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segmento: {
              type: Type.STRING,
              description: "Segmento de mercado do lead (ex: Saúde & Clínicas, Imobiliário, Varejo Automotivo).",
            },
            demanda: {
              type: Type.STRING,
              description: "Resumo claro do problema que o lead quer resolver com a BuildAI.",
            },
            urgencia: {
              type: Type.STRING,
              enum: ["baixa", "media", "alta"],
              description: "Nível de urgência identificado na conversa.",
            },
            sentimento: {
              type: Type.STRING,
              enum: ["positivo", "neutro", "negativo"],
              description: "Sentimento predominante do lead nas últimas mensagens.",
            },
            nota: {
              type: Type.INTEGER,
              description: "Nota inteira de 0 a 10 indicando o quão quente está o lead.",
            },
            resumo: {
              type: Type.STRING,
              description: "Resumo executivo da conversa e do momento atual do lead (máximo 2 frases).",
            },
            justificativa: {
              type: Type.STRING,
              description: "Breve justificativa dos ajustes sugeridos para revisão do vendedor antes de salvar.",
            },
          },
          required: [
            "segmento",
            "demanda",
            "urgencia",
            "sentimento",
            "nota",
            "resumo",
            "justificativa",
          ],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      res.status(502).json({
        error: "A IA não retornou conteúdo analisável. Tente novamente.",
      });
      return;
    }

    const parsed = JSON.parse(rawText) as {
      segmento: string;
      demanda: string;
      urgencia: string;
      sentimento: string;
      nota: number;
      resumo: string;
      justificativa: string;
    };

    const clampedNota = Math.max(0, Math.min(10, Math.round(Number(parsed.nota) || 0)));
    const validUrgencia = ["baixa", "media", "alta"].includes(parsed.urgencia)
      ? parsed.urgencia
      : "media";
    const validSentimento = ["positivo", "neutro", "negativo"].includes(parsed.sentimento)
      ? parsed.sentimento
      : "neutro";

    res.json({
      suggestion: {
        segmento: parsed.segmento,
        demanda: parsed.demanda,
        urgencia: validUrgencia,
        sentimento: validSentimento,
        nota: clampedNota,
        resumo: parsed.resumo,
        justificativa: parsed.justificativa,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar Gemini API.";
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BuildAI Leads server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
