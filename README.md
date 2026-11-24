# BuildAI Leads

CRM web da BuildAI para a equipe comercial acompanhar os leads que o atendente de IA recebe no WhatsApp.

Quando alguém pede atendimento humano, demonstra interesse ou esfria depois de uma conversa, o lead entra aqui com nota, sentimento, urgência e um resumo. O time vê o que precisa de retorno, move a oportunidade no funil e registra o que foi falado.

## Para quem é

Para quem vende os atendentes de IA da BuildAI e precisa transformar conversas de WhatsApp em um funil acompanhável, em vez de deixar o histórico espalhado no celular.

## O que dá para fazer

- **Painel.** Leads da semana, leads quentes (nota 7 ou mais), reuniões agendadas, taxa de conversão, volume dos últimos 7 dias e distribuição de sentimento.
- **Funil Kanban.** Seis etapas: Novo, Qualificando, Reunião agendada, Proposta, Ganho e Perdido.
- **Lista.** Busca e filtros por etapa, origem, urgência e sentimento.
- **Ficha do lead.** Empresa, segmento, demanda, volume, nota de 0 a 10, próximo passo e responsável. Dá para abrir o WhatsApp e mandar o link da agenda da própria empresa.
- **Agenda.** Próximas reuniões marcadas pela página pública, com link para o lead e para o Google Meet.
- **Histórico.** Mensagens de entrada e saída no WhatsApp, notas internas, ligações e reuniões.
- **Alertas.** Handoff sem resposta humana, e lead quente sem contato há mais de 24 horas.
- **Análise com Gemini.** Relê a ficha e o histórico e sugere segmento, demanda, urgência, sentimento, nota e resumo. A sugestão só entra na ficha depois que alguém revisa e salva.

Origens previstas: site, Instagram, LinkedIn, indicação ou outra.

## Como os dados ficam

Login e cadastro por e-mail no Firebase Authentication. No primeiro acesso, a pessoa cria a empresa e entra como dona. Leads e interações ficam no Cloud Firestore, no projeto `aicrm-7246d`, e cada consulta só vê a empresa do usuário logado. O ID da empresa aparece em Configurações, para a integração do WhatsApp. As regras estão em `firestore.rules`.

O botão de exemplo na tela de entrada guarda oito leads só neste navegador, sem gravar no Firebase.

Datas e alertas usam o fuso `America/Sao_Paulo`.

## Rodar localmente

Requisitos: Node.js 20 ou superior.

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env.local` e preencha `GEMINI_API_KEY` e `APP_URL`.
3. No projeto Firebase `aicrm-7246d`, crie o Firestore (região sugerida: `southamerica-east1`) e ative o login por e-mail e senha.
4. Publique regras e autenticação: `npx -y firebase-tools@latest deploy --only firestore,auth --project aicrm-7246d`
5. Suba o app: `npm run dev`

`npm run build` gera o frontend. `npm run lint` checa os tipos.

## Agenda pública

Cada empresa tem uma página sem login em `https://buildaicrm.web.app/agendar/{slug}`. O robô do WhatsApp pode mandar `?tel=`, `?nome=` e `?lead=` para preencher o formulário. Quem marca a reunião entra no Google Calendar da empresa, com Google Meet, e o lead fica em Reunião agendada.

O refresh token do Google fica só na Cloud Function, no documento `agenda_segredos`, que o cliente não lê. O Client ID não é segredo. O Client Secret e a chave dos links de cancelar/remarcar ficam no Secret Manager.

Cloud Functions e Secret Manager exigem o plano Blaze.

### Google Cloud

No projeto `aicrm-7246d`:

1. Ative a **Google Calendar API** e a **Secret Manager API**.
2. Em APIs e serviços, crie a tela de consentimento OAuth, tipo Externo, nome BuildAI Leads. Escopos:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.freebusy`
   - `https://www.googleapis.com/auth/userinfo.email`
3. Enquanto a tela estiver em Teste, adicione o Gmail de cada empresa como usuário de teste. Nesse modo o refresh token expira em 7 dias. Para valer além disso, publique o app. Esses escopos de Calendar são sensíveis e o Google pede verificação antes de contas fora da lista de teste.
4. Crie uma credencial OAuth, tipo aplicação da Web.
   - Origem JavaScript autorizada: `https://buildaicrm.web.app`
   - Política de privacidade: `https://buildaicrm.web.app/privacidade`
   - URI de redirecionamento: `https://southamerica-east1-aicrm-7246d.cloudfunctions.net/agendaOauthCallback`
5. Grave os segredos e o Client ID:

```bash
npx -y firebase-tools@latest functions:secrets:set GOOGLE_OAUTH_CLIENT_SECRET --project aicrm-7246d
npx -y firebase-tools@latest functions:secrets:set AGENDA_TOKEN_SECRET --project aicrm-7246d
```

Copie `functions/.env.example` para `functions/.env` e preencha `GOOGLE_OAUTH_CLIENT_ID`. A conta de serviço das functions precisa do papel Secret Manager Secret Accessor. O `firebase deploy` das functions normalmente associa esse acesso aos segredos declarados no código.

No app, o dono abre Configurações e clica em Conectar Google Calendar.

### Deploy

```bash
npx -y firebase-tools@latest deploy --only hosting,functions,firestore:rules,firestore:indexes --project aicrm-7246d
```

