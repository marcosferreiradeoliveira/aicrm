-- =============================================================================
-- BuildAI Leads — Schema SQL para Supabase (PostgreSQL + RLS)
-- =============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase.
-- Ele cria as tabelas `leads` e `interacoes`, índices, trigger de `updated_at`,
-- políticas RLS restritas a usuários autenticados e 8 leads fictícios de exemplo.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Tabela: leads
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nome text not null,
  telefone text not null unique,
  empresa text,
  segmento text,
  demanda text,
  volume text,
  urgencia text not null default 'media'
    check (urgencia in ('baixa', 'media', 'alta')),
  sentimento text not null default 'neutro'
    check (sentimento in ('positivo', 'neutro', 'negativo')),
  nota integer not null default 5
    check (nota >= 0 and nota <= 10),
  origem text not null default 'site'
    check (origem in ('site', 'instagram', 'linkedin', 'indicacao', 'outro')),
  etapa text not null default 'novo'
    check (etapa in ('novo', 'qualificando', 'reuniao_agendada', 'proposta', 'ganho', 'perdido')),
  resumo text,
  handoff boolean not null default false,
  proximo_passo text,
  data_proximo_passo timestamptz,
  responsavel text
);

-- -----------------------------------------------------------------------------
-- 2. Tabela: interacoes
-- -----------------------------------------------------------------------------
create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  tipo text not null
    check (tipo in ('whatsapp_entrada', 'whatsapp_saida', 'nota', 'ligacao', 'reuniao')),
  conteudo text not null
);

-- -----------------------------------------------------------------------------
-- 3. Trigger para atualizar `updated_at` automaticamente em `leads`
-- -----------------------------------------------------------------------------
create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row
  execute function public.set_leads_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Índices de performance
-- -----------------------------------------------------------------------------
create index if not exists idx_leads_etapa on public.leads (etapa);
create index if not exists idx_leads_nota on public.leads (nota desc);
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_handoff on public.leads (handoff) where handoff = true;
create index if not exists idx_leads_segmento on public.leads (segmento);
create index if not exists idx_leads_sentimento on public.leads (sentimento);
create index if not exists idx_leads_origem on public.leads (origem);
create index if not exists idx_leads_urgencia on public.leads (urgencia);
create index if not exists idx_interacoes_lead_created on public.interacoes (lead_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- Somente usuários autenticados (Supabase Auth) podem ler, criar, editar e excluir.
-- -----------------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.interacoes enable row level security;

-- Políticas para `leads`
drop policy if exists "Autenticados leem leads" on public.leads;
create policy "Autenticados leem leads"
  on public.leads for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "Autenticados inserem leads" on public.leads;
create policy "Autenticados inserem leads"
  on public.leads for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Autenticados atualizam leads" on public.leads;
create policy "Autenticados atualizam leads"
  on public.leads for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Autenticados excluem leads" on public.leads;
create policy "Autenticados excluem leads"
  on public.leads for delete
  to authenticated
  using (auth.uid() is not null);

-- Políticas para `interacoes`
drop policy if exists "Autenticados leem interacoes" on public.interacoes;
create policy "Autenticados leem interacoes"
  on public.interacoes for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "Autenticados inserem interacoes" on public.interacoes;
create policy "Autenticados inserem interacoes"
  on public.interacoes for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Autenticados atualizam interacoes" on public.interacoes;
create policy "Autenticados atualizam interacoes"
  on public.interacoes for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Autenticados excluem interacoes" on public.interacoes;
create policy "Autenticados excluem interacoes"
  on public.interacoes for delete
  to authenticated
  using (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- 6. Dados iniciais: 8 leads fictícios claramente marcados como [Exemplo]
-- -----------------------------------------------------------------------------
do $$
declare
  v_id1 uuid;
  v_id2 uuid;
  v_id3 uuid;
  v_id4 uuid;
  v_id5 uuid;
  v_id6 uuid;
  v_id7 uuid;
  v_id8 uuid;
begin
  if not exists (select 1 from public.leads where telefone = '5511991010001') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '2 hours', now() - interval '1 hour',
      'Camila Duarte [Exemplo]', '5511991010001', 'Clínica Vida Plena [Exemplo]', 'Saúde & Clínicas',
      'Automatizar confirmação de consultas e triagem de convênios no WhatsApp', '140 conversas/dia',
      'alta', 'positivo', 9, 'instagram', 'qualificando',
      'Lead pediu orçamento direto após explicar gargalo no agendamento de 3 unidades. Quer falar com especialista hoje.',
      true, 'Responder solicitação de orçamento no WhatsApp', now() + interval '2 hours', 'Marcos Ferreira'
    ) returning id into v_id1;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id1, now() - interval '2 hours', 'whatsapp_entrada', 'Olá! Vi o anúncio no Instagram. Temos 3 clínicas e recebemos umas 140 mensagens/dia para agendar exames.'),
      (v_id1, now() - interval '1 hour 55 minutes', 'whatsapp_saida', 'Oi Camila! Sou a IA da BuildAI. Perfeito, integramos com agenda e convênios. Hoje vocês usam qual sistema de prontuário?'),
      (v_id1, now() - interval '1 hour', 'whatsapp_entrada', 'Usamos Feegow. Quero falar com um consultor humano para ver valores e prazo de implantação ainda essa semana.');
  end if;

  if not exists (select 1 from public.leads where telefone = '5521992020002') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '36 hours', now() - interval '30 hours',
      'Rafael Mendes [Exemplo]', '5521992020002', 'AutoPeças Horizonte [Exemplo]', 'Varejo Automotivo',
      'Orçamento automático de peças por código/foto e encaminhamento para balcão', '95 conversas/dia',
      'alta', 'positivo', 8, 'site', 'proposta',
      'Solicitou proposta para catálogo integrado ao estoque. Último contato foi há mais de 24h.',
      false, 'Fazer follow-up da proposta enviada', now() + interval '4 hours', 'Ana Paula'
    ) returning id into v_id2;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id2, now() - interval '36 hours', 'whatsapp_entrada', 'Boa tarde, queria entender se a IA consegue consultar nosso estoque de autopeças antes de passar pro vendedor.'),
      (v_id2, now() - interval '35 hours', 'whatsapp_saida', 'Boa tarde Rafael! Sim, conectamos via API ao seu ERP para consultar disponibilidade e preço em tempo real.'),
      (v_id2, now() - interval '30 hours', 'reuniao', 'Demo realizada via Meet. Enviada proposta comercial plano Growth.');
  end if;

  if not exists (select 1 from public.leads where telefone = '5531993030003') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '5 hours', now() - interval '3 hours',
      'Juliana Costa [Exemplo]', '5531993030003', 'Imobiliária Prime Sul [Exemplo]', 'Imobiliário',
      'Qualificar compradores de imóveis na planta e agendar visita com corretor', '60 conversas/dia',
      'alta', 'positivo', 8, 'indicacao', 'novo',
      'Chegou por indicação e pediu atendimento humano urgente para campanha de lançamento no sábado.',
      true, 'Ligar e confirmar disponibilidade de setup rápido', now() + interval '1 hour', 'Marcos Ferreira'
    ) returning id into v_id3;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id3, now() - interval '5 hours', 'whatsapp_entrada', 'Oi, o Thiago da Construtora Alfa indicou vocês. Temos lançamento no sábado e precisamos de triagem no WhatsApp.'),
      (v_id3, now() - interval '3 hours', 'whatsapp_entrada', 'Conseguem passar um humano aqui pra alinharmos o escopo e orçamento rápido?');
  end if;

  if not exists (select 1 from public.leads where telefone = '5541994040004') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '2 days', now() - interval '28 hours',
      'Eduardo Braga [Exemplo]', '5541994040004', 'B2B Logística Express [Exemplo]', 'Logística & Transporte',
      'Rastreamento de cargas e emissão de 2ª via de boleto no WhatsApp', '210 conversas/dia',
      'media', 'positivo', 7, 'linkedin', 'reuniao_agendada',
      'Reunião marcada no Calendly, mas está sem interação há mais de 24h. Bom potencial de ticket.',
      false, 'Enviar lembrete da call e pauta técnica', now() + interval '1 day', 'Lucas Oliveira'
    ) returning id into v_id4;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id4, now() - interval '2 days', 'whatsapp_entrada', 'Vi o case de vocês no LinkedIn. Nosso SAC sofre com pedido de status de entrega e 2ª via de boleto.'),
      (v_id4, now() - interval '28 hours', 'whatsapp_saida', 'Show Eduardo! Reunião confirmada pelo Calendly. Qualquer dúvida antes da call estou por aqui.');
  end if;

  if not exists (select 1 from public.leads where telefone = '5551995050005') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '3 days', now() - interval '12 hours',
      'Fernanda Lima [Exemplo]', '5551995050005', 'Escola Idiomas Global [Exemplo]', 'Educação',
      'Responder dúvidas sobre matrículas e agendar aula experimental', '45 conversas/dia',
      'media', 'neutro', 6, 'site', 'qualificando',
      'Comparando BuildAI com outra plataforma. Precisa de ROI claro para aprovar com a diretoria.',
      false, 'Enviar comparativo de ROI e case de escola', now() + interval '2 days', 'Ana Paula'
    ) returning id into v_id5;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id5, now() - interval '3 days', 'whatsapp_entrada', 'Olá, gostaria de saber como funciona o bot para matrículas de escola de inglês.'),
      (v_id5, now() - interval '12 hours', 'whatsapp_saida', 'Oi Fernanda! Enviamos os detalhes do fluxo de aula experimental. Você conseguiu avaliar com a diretoria?');
  end if;

  if not exists (select 1 from public.leads where telefone = '5511996060006') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '4 days', now() - interval '18 hours',
      'Bruno Tavares [Exemplo]', '5511996060006', 'Academia Corpo Ativo [Exemplo]', 'Fitness & Bem-estar',
      'Atendimento fora do horário comercial e recuperação de alunos inativos', '35 conversas/dia',
      'baixa', 'neutro', 5, 'instagram', 'novo',
      'Curioso sobre preço, ainda sem orçamento definido para este trimestre.',
      false, 'Nutrir com material educativo de automação', now() + interval '5 days', 'Lucas Oliveira'
    ) returning id into v_id6;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id6, now() - interval '4 days', 'whatsapp_entrada', 'Quanto custa um atendente de IA para academia?'),
      (v_id6, now() - interval '18 hours', 'nota', 'Lead informou que só pretende contratar no próximo mês.');
  end if;

  if not exists (select 1 from public.leads where telefone = '5585997070007') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '5 days', now() - interval '6 hours',
      'Patrícia Rocha [Exemplo]', '5585997070007', 'Odonto Sorriso [Exemplo]', 'Saúde & Clínicas',
      'Agendamento de avaliação odontológica e triagem de implantes', '110 conversas/dia',
      'alta', 'positivo', 10, 'indicacao', 'ganho',
      'Contrato assinado! Onboarding agendado para integração com WhatsApp oficial.',
      false, 'Iniciar kickoff de implantação com time técnico', now() + interval '1 day', 'Marcos Ferreira'
    ) returning id into v_id7;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id7, now() - interval '5 days', 'whatsapp_entrada', 'Queremos automatizar toda a recepção da clínica odontológica.'),
      (v_id7, now() - interval '2 days', 'reuniao', 'Proposta aprovada pela sócia Patrícia.'),
      (v_id7, now() - interval '6 hours', 'whatsapp_saida', 'Bem-vinda à BuildAI, Patrícia! Já reservamos seu horário de kickoff.');
  end if;

  if not exists (select 1 from public.leads where telefone = '5561998080008') then
    insert into public.leads (
      created_at, updated_at, nome, telefone, empresa, segmento, demanda, volume,
      urgencia, sentimento, nota, origem, etapa, resumo, handoff, proximo_passo, data_proximo_passo, responsavel
    ) values (
      now() - interval '6 days', now() - interval '3 days',
      'Henrique Alves [Exemplo]', '5561998080008', 'Mercadinho Central [Exemplo]', 'Varejo Alimentar',
      'Disparo em massa promocional sem API oficial', '15 conversas/dia',
      'baixa', 'negativo', 2, 'outro', 'perdido',
      'Queria ferramenta para spam não oficial e achou o valor incompatível com o porte atual.',
      false, 'Encerrado — fora do perfil ideal (ICP)', null, 'Ana Paula'
    ) returning id into v_id8;

    insert into public.interacoes (lead_id, created_at, tipo, conteudo) values
      (v_id8, now() - interval '6 days', 'whatsapp_entrada', 'Vocês fazem disparo em massa pra 10 mil contatos sem chip oficial?'),
      (v_id8, now() - interval '3 days', 'whatsapp_saida', 'Oi Henrique, trabalhamos apenas com API oficial e atendimento inteligente, não fazemos disparo frio.');
  end if;
end $$;
