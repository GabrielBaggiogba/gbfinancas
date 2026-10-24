-- GBFinanças: conexão com bancos pelo Open Finance (via Pluggy).
-- 1) `conexoes_bancarias`: um vínculo por banco autorizado pela pessoa (item da Pluggy).
--    Só o servidor grava (chave service_role); a pessoa e a família leem.
-- 2) `externo_id` em contas, cartões e lançamentos: o id do banco, para nunca importar duas vezes.

create table public.conexoes_bancarias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  criado_por uuid references auth.users (id) on delete set null,
  item_id text not null unique,
  instituicao text not null default '',
  logo text,
  cor text,
  status text not null default 'atualizando'
    check (status in ('atualizando', 'ok', 'reconectar', 'erro')),
  detalhe text,
  ultima_sincronizacao timestamptz,
  consentimento_expira timestamptz,
  criado_em timestamptz not null default now()
);
create index conexoes_user_idx on public.conexoes_bancarias (user_id);

alter table public.conexoes_bancarias enable row level security;
revoke all on public.conexoes_bancarias from anon, authenticated;
grant select on public.conexoes_bancarias to authenticated;
create policy "dono e família leem" on public.conexoes_bancarias
  for select to authenticated
  using ((select auth.uid()) = user_id or public.e_membro_de(user_id));

alter table public.contas add column externo_id text;
alter table public.cartoes add column externo_id text;
alter table public.lancamentos add column externo_id text;

-- Nulo não conflita: só as linhas vindas do banco entram na regra.
alter table public.contas add constraint contas_externo_key unique (user_id, externo_id);
alter table public.cartoes add constraint cartoes_externo_key unique (user_id, externo_id);
alter table public.lancamentos add constraint lancamentos_externo_key unique (user_id, externo_id);
