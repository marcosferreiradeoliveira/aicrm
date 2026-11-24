import type { Interacao, Lead } from "../types/crm";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export interface ExampleSeedData {
  leads: Lead[];
  interacoes: Interacao[];
}

export function buildExampleSeedData(empresaId = "demo"): ExampleSeedData {
  const leads: Array<Omit<Lead, "empresa_id">> = [
    {
      id: "11111111-1111-4111-8111-111111111101",
      created_at: hoursAgo(2),
      updated_at: hoursAgo(1),
      nome: "Camila Duarte [Exemplo]",
      telefone: "5511991010001",
      empresa: "Clínica Vida Plena [Exemplo]",
      segmento: "Saúde & Clínicas",
      demanda:
        "Automatizar confirmação de consultas e triagem de convênios no WhatsApp",
      volume: "140 conversas/dia",
      urgencia: "alta",
      sentimento: "positivo",
      nota: 9,
      origem: "instagram",
      etapa: "qualificando",
      resumo:
        "Lead pediu orçamento direto após explicar gargalo no agendamento de 3 unidades. Quer falar com especialista hoje.",
      handoff: true,
      proximo_passo: "Responder solicitação de orçamento no WhatsApp",
      data_proximo_passo: hoursFromNow(2),
      responsavel: "Marcos Ferreira",
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      created_at: hoursAgo(36),
      updated_at: hoursAgo(30),
      nome: "Rafael Mendes [Exemplo]",
      telefone: "5521992020002",
      empresa: "AutoPeças Horizonte [Exemplo]",
      segmento: "Varejo Automotivo",
      demanda:
        "Orçamento automático de peças por código/foto e encaminhamento para balcão",
      volume: "95 conversas/dia",
      urgencia: "alta",
      sentimento: "positivo",
      nota: 8,
      origem: "site",
      etapa: "proposta",
      resumo:
        "Solicitou proposta para catálogo integrado ao estoque. Último contato foi há mais de 24h.",
      handoff: false,
      proximo_passo: "Fazer follow-up da proposta enviada",
      data_proximo_passo: hoursFromNow(4),
      responsavel: "Ana Paula",
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      created_at: hoursAgo(5),
      updated_at: hoursAgo(3),
      nome: "Juliana Costa [Exemplo]",
      telefone: "5531993030003",
      empresa: "Imobiliária Prime Sul [Exemplo]",
      segmento: "Imobiliário",
      demanda:
        "Qualificar compradores de imóveis na planta e agendar visita com corretor",
      volume: "60 conversas/dia",
      urgencia: "alta",
      sentimento: "positivo",
      nota: 8,
      origem: "indicacao",
      etapa: "novo",
      resumo:
        "Chegou por indicação e pediu atendimento humano urgente para campanha de lançamento no sábado.",
      handoff: true,
      proximo_passo: "Ligar e confirmar disponibilidade de setup rápido",
      data_proximo_passo: hoursFromNow(1),
      responsavel: "Marcos Ferreira",
    },
    {
      id: "11111111-1111-4111-8111-111111111104",
      created_at: hoursAgo(48),
      updated_at: hoursAgo(28),
      nome: "Eduardo Braga [Exemplo]",
      telefone: "5541994040004",
      empresa: "B2B Logística Express [Exemplo]",
      segmento: "Logística & Transporte",
      demanda:
        "Rastreamento de cargas e emissão de 2ª via de boleto no WhatsApp",
      volume: "210 conversas/dia",
      urgencia: "media",
      sentimento: "positivo",
      nota: 7,
      origem: "linkedin",
      etapa: "reuniao_agendada",
      resumo:
        "Reunião marcada no Calendly, mas está sem interação há mais de 24h. Bom potencial de ticket.",
      handoff: false,
      proximo_passo: "Enviar lembrete da call e pauta técnica",
      data_proximo_passo: hoursFromNow(20),
      responsavel: "Lucas Oliveira",
    },
    {
      id: "11111111-1111-4111-8111-111111111105",
      created_at: hoursAgo(72),
      updated_at: hoursAgo(12),
      nome: "Fernanda Lima [Exemplo]",
      telefone: "5551995050005",
      empresa: "Escola Idiomas Global [Exemplo]",
      segmento: "Educação",
      demanda:
        "Responder dúvidas sobre matrículas e agendar aula experimental",
      volume: "45 conversas/dia",
      urgencia: "media",
      sentimento: "neutro",
      nota: 6,
      origem: "site",
      etapa: "qualificando",
      resumo:
        "Comparando BuildAI com outra plataforma. Precisa de ROI claro para aprovar com a diretoria.",
      handoff: false,
      proximo_passo: "Enviar comparativo de ROI e case de escola",
      data_proximo_passo: hoursFromNow(48),
      responsavel: "Ana Paula",
    },
    {
      id: "11111111-1111-4111-8111-111111111106",
      created_at: hoursAgo(96),
      updated_at: hoursAgo(18),
      nome: "Bruno Tavares [Exemplo]",
      telefone: "5511996060006",
      empresa: "Academia Corpo Ativo [Exemplo]",
      segmento: "Fitness & Bem-estar",
      demanda:
        "Atendimento fora do horário comercial e recuperação de alunos inativos",
      volume: "35 conversas/dia",
      urgencia: "baixa",
      sentimento: "neutro",
      nota: 5,
      origem: "instagram",
      etapa: "novo",
      resumo:
        "Curioso sobre preço, ainda sem orçamento definido para este trimestre.",
      handoff: false,
      proximo_passo: "Nutrir com material educativo de automação",
      data_proximo_passo: hoursFromNow(120),
      responsavel: "Lucas Oliveira",
    },
    {
      id: "11111111-1111-4111-8111-111111111107",
      created_at: hoursAgo(120),
      updated_at: hoursAgo(6),
      nome: "Patrícia Rocha [Exemplo]",
      telefone: "5585997070007",
      empresa: "Odonto Sorriso [Exemplo]",
      segmento: "Saúde & Clínicas",
      demanda:
        "Agendamento de avaliação odontológica e triagem de implantes",
      volume: "110 conversas/dia",
      urgencia: "alta",
      sentimento: "positivo",
      nota: 10,
      origem: "indicacao",
      etapa: "ganho",
      resumo:
        "Contrato assinado! Onboarding agendado para integração com WhatsApp oficial.",
      handoff: false,
      proximo_passo: "Iniciar kickoff de implantação com time técnico",
      data_proximo_passo: hoursFromNow(24),
      responsavel: "Marcos Ferreira",
    },
    {
      id: "11111111-1111-4111-8111-111111111108",
      created_at: hoursAgo(144),
      updated_at: hoursAgo(72),
      nome: "Henrique Alves [Exemplo]",
      telefone: "5561998080008",
      empresa: "Mercadinho Central [Exemplo]",
      segmento: "Varejo Alimentar",
      demanda: "Disparo em massa promocional sem API oficial",
      volume: "15 conversas/dia",
      urgencia: "baixa",
      sentimento: "negativo",
      nota: 2,
      origem: "outro",
      etapa: "perdido",
      resumo:
        "Queria ferramenta para spam não oficial e achou o valor incompatível com o porte atual.",
      handoff: false,
      proximo_passo: "Encerrado — fora do perfil ideal (ICP)",
      data_proximo_passo: null,
      responsavel: "Ana Paula",
    },
  ];

  const interacoes: Array<Omit<Interacao, "empresa_id">> = [
    {
      id: "22222222-2222-4222-8222-222222222101",
      lead_id: leads[0].id,
      created_at: hoursAgo(2),
      tipo: "whatsapp_entrada",
      conteudo:
        "Olá! Vi o anúncio no Instagram. Temos 3 clínicas e recebemos umas 140 mensagens/dia para agendar exames.",
    },
    {
      id: "22222222-2222-4222-8222-222222222102",
      lead_id: leads[0].id,
      created_at: hoursAgo(1.9),
      tipo: "whatsapp_saida",
      conteudo:
        "Oi Camila! Sou a IA da BuildAI. Perfeito, integramos com agenda e convênios. Hoje vocês usam qual sistema de prontuário?",
    },
    {
      id: "22222222-2222-4222-8222-222222222103",
      lead_id: leads[0].id,
      created_at: hoursAgo(1),
      tipo: "whatsapp_entrada",
      conteudo:
        "Usamos Feegow. Quero falar com um consultor humano para ver valores e prazo de implantação ainda essa semana.",
    },
    {
      id: "22222222-2222-4222-8222-222222222201",
      lead_id: leads[1].id,
      created_at: hoursAgo(36),
      tipo: "whatsapp_entrada",
      conteudo:
        "Boa tarde, queria entender se a IA consegue consultar nosso estoque de autopeças antes de passar pro vendedor.",
    },
    {
      id: "22222222-2222-4222-8222-222222222202",
      lead_id: leads[1].id,
      created_at: hoursAgo(35),
      tipo: "whatsapp_saida",
      conteudo:
        "Boa tarde Rafael! Sim, conectamos via API ao seu ERP para consultar disponibilidade e preço em tempo real.",
    },
    {
      id: "22222222-2222-4222-8222-222222222203",
      lead_id: leads[1].id,
      created_at: hoursAgo(30),
      tipo: "reuniao",
      conteudo: "Demo realizada via Meet. Enviada proposta comercial plano Growth.",
    },
    {
      id: "22222222-2222-4222-8222-222222222301",
      lead_id: leads[2].id,
      created_at: hoursAgo(5),
      tipo: "whatsapp_entrada",
      conteudo:
        "Oi, o Thiago da Construtora Alfa indicou vocês. Temos lançamento no sábado e precisamos de triagem no WhatsApp.",
    },
    {
      id: "22222222-2222-4222-8222-222222222302",
      lead_id: leads[2].id,
      created_at: hoursAgo(3),
      tipo: "whatsapp_entrada",
      conteudo:
        "Conseguem passar um humano aqui pra alinharmos o escopo e orçamento rápido?",
    },
    {
      id: "22222222-2222-4222-8222-222222222401",
      lead_id: leads[3].id,
      created_at: hoursAgo(48),
      tipo: "whatsapp_entrada",
      conteudo:
        "Vi o case de vocês no LinkedIn. Nosso SAC sofre com pedido de status de entrega e 2ª via de boleto.",
    },
    {
      id: "22222222-2222-4222-8222-222222222402",
      lead_id: leads[3].id,
      created_at: hoursAgo(28),
      tipo: "whatsapp_saida",
      conteudo:
        "Show Eduardo! Reunião confirmada pelo Calendly. Qualquer dúvida antes da call estou por aqui.",
    },
    {
      id: "22222222-2222-4222-8222-222222222501",
      lead_id: leads[4].id,
      created_at: hoursAgo(72),
      tipo: "whatsapp_entrada",
      conteudo:
        "Olá, gostaria de saber como funciona o bot para matrículas de escola de inglês.",
    },
    {
      id: "22222222-2222-4222-8222-222222222502",
      lead_id: leads[4].id,
      created_at: hoursAgo(12),
      tipo: "whatsapp_saida",
      conteudo:
        "Oi Fernanda! Enviamos os detalhes do fluxo de aula experimental. Você conseguiu avaliar com a diretoria?",
    },
    {
      id: "22222222-2222-4222-8222-222222222601",
      lead_id: leads[5].id,
      created_at: hoursAgo(96),
      tipo: "whatsapp_entrada",
      conteudo: "Quanto custa um atendente de IA para academia?",
    },
    {
      id: "22222222-2222-4222-8222-222222222602",
      lead_id: leads[5].id,
      created_at: hoursAgo(18),
      tipo: "nota",
      conteudo: "Lead informou que só pretende contratar no próximo mês.",
    },
    {
      id: "22222222-2222-4222-8222-222222222701",
      lead_id: leads[6].id,
      created_at: hoursAgo(120),
      tipo: "whatsapp_entrada",
      conteudo: "Queremos automatizar toda a recepção da clínica odontológica.",
    },
    {
      id: "22222222-2222-4222-8222-222222222702",
      lead_id: leads[6].id,
      created_at: hoursAgo(48),
      tipo: "reuniao",
      conteudo: "Proposta aprovada pela sócia Patrícia.",
    },
    {
      id: "22222222-2222-4222-8222-222222222703",
      lead_id: leads[6].id,
      created_at: hoursAgo(6),
      tipo: "whatsapp_saida",
      conteudo:
        "Bem-vinda à BuildAI, Patrícia! Já reservamos seu horário de kickoff.",
    },
    {
      id: "22222222-2222-4222-8222-222222222801",
      lead_id: leads[7].id,
      created_at: hoursAgo(144),
      tipo: "whatsapp_entrada",
      conteudo:
        "Vocês fazem disparo em massa pra 10 mil contatos sem chip oficial?",
    },
    {
      id: "22222222-2222-4222-8222-222222222802",
      lead_id: leads[7].id,
      created_at: hoursAgo(72),
      tipo: "whatsapp_saida",
      conteudo:
        "Oi Henrique, trabalhamos apenas com API oficial e atendimento inteligente, não fazemos disparo frio.",
    },
  ];

  return {
    leads: leads.map((lead) => ({ ...lead, empresa_id: empresaId })),
    interacoes: interacoes.map((item) => ({ ...item, empresa_id: empresaId })),
  };
}
