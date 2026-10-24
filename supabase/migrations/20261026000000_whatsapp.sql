-- GBFinanças: WhatsApp e lembretes.
-- 1) Mensagens já processadas: a Meta pode reenviar a mesma mensagem; o id evita lançar duas vezes.
-- 2) Últimos lançamentos feitos pelo WhatsApp, para o comando "desfazer".
-- Só o servidor (chave service_role) mexe nisso; ninguém lê pela API.

create table public.whatsapp_mensagens (
  id text primary key,
  recebida_em timestamptz not null default now()
);
alter table public.whatsapp_mensagens enable row level security;
revoke all on public.whatsapp_mensagens from anon, authenticated;

alter table public.perfis
  add column whatsapp_ultimos uuid[] not null default '{}',
  add column whatsapp_ultimos_em timestamptz;
