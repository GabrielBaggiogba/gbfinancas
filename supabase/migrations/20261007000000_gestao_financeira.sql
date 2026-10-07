-- GBFinanças: gestão financeira completa.
-- Contas, cartões, categorias, lançamentos, orçamentos, metas, aportes e recorrentes.
-- Toda tabela tem RLS: cada pessoa só enxerga e altera as próprias linhas.
-- Valores em reais com duas casas (numeric); o app trabalha em centavos inteiros.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Contas ----------
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  tipo text not null default 'corrente'
    check (tipo in ('corrente', 'dinheiro', 'poupanca', 'carteira', 'investimento')),
  saldo_inicial numeric(14, 2) not null default 0,
  arquivada boolean not null default false,
  created_at timestamptz not null default now()
);
create index contas_user_idx on public.contas (user_id);

-- ---------- Cartões de crédito ----------
create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  limite numeric(14, 2) not null default 0 check (limite >= 0),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 28),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 28),
  arquivado boolean not null default false,
  created_at timestamptz not null default now()
);
create index cartoes_user_idx on public.cartoes (user_id);

-- ---------- Categorias (com subcategoria opcional) ----------
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  tipo text not null check (tipo in ('receita', 'despesa')),
  icone text not null default 'tag',
  cor text not null default '#3987e5' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  pai_id uuid references public.categorias (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index categorias_user_idx on public.categorias (user_id);

-- ---------- Recorrentes ----------
create table public.recorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null check (char_length(descricao) between 1 and 120),
  valor numeric(14, 2) not null check (valor > 0),
  categoria_id uuid references public.categorias (id) on delete set null,
  conta_id uuid references public.contas (id) on delete set null,
  cartao_id uuid references public.cartoes (id) on delete set null,
  frequencia text not null check (frequencia in ('semanal', 'mensal', 'anual')),
  proximo_vencimento date not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index recorrentes_user_idx on public.recorrentes (user_id);

-- ---------- Lançamentos ----------
-- receita / despesa: movimentam uma conta (ou, na despesa, um cartão).
-- transferencia: sai de conta_id e entra em conta_destino_id; não é renda nem gasto.
-- pagamento_fatura: sai de conta_id e abate a fatura (fatura_ref = 'AAAA-MM') do cartão.
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa', 'transferencia', 'pagamento_fatura')),
  valor numeric(14, 2) not null check (valor > 0 and valor <= 99999999.99),
  data date not null,
  descricao text not null default '' check (char_length(descricao) <= 120),
  categoria_id uuid references public.categorias (id) on delete set null,
  conta_id uuid references public.contas (id) on delete restrict,
  conta_destino_id uuid references public.contas (id) on delete restrict,
  cartao_id uuid references public.cartoes (id) on delete restrict,
  forma_pagamento text
    check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito', 'boleto', 'transferencia')),
  observacao text not null default '' check (char_length(observacao) <= 500),
  parcela_atual smallint check (parcela_atual >= 1),
  parcela_total smallint check (parcela_total between 1 and 60),
  grupo_id uuid,
  recorrente_id uuid references public.recorrentes (id) on delete set null,
  fatura_ref text check (fatura_ref ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lancamentos_origem check (
    (tipo = 'receita' and conta_id is not null and cartao_id is null and conta_destino_id is null)
    or (tipo = 'despesa' and conta_destino_id is null
        and ((conta_id is not null and cartao_id is null) or (conta_id is null and cartao_id is not null)))
    or (tipo = 'transferencia' and conta_id is not null and conta_destino_id is not null
        and conta_id <> conta_destino_id and cartao_id is null)
    or (tipo = 'pagamento_fatura' and conta_id is not null and cartao_id is not null
        and fatura_ref is not null and conta_destino_id is null)
  ),
  constraint lancamentos_parcelas check (
    (parcela_atual is null and parcela_total is null)
    or (parcela_atual is not null and parcela_total is not null and parcela_atual <= parcela_total)
  )
);
create index lancamentos_user_data_idx on public.lancamentos (user_id, data desc);
create index lancamentos_conta_idx on public.lancamentos (conta_id);
create index lancamentos_cartao_idx on public.lancamentos (cartao_id);

create trigger lancamentos_updated_at
before update on public.lancamentos
for each row execute function public.set_updated_at();

-- ---------- Orçamentos (limite mensal; categoria nula = orçamento geral) ----------
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete cascade,
  valor numeric(14, 2) not null check (valor > 0),
  created_at timestamptz not null default now()
);
create unique index orcamentos_categoria_key on public.orcamentos (user_id, categoria_id)
  where categoria_id is not null;
create unique index orcamentos_geral_key on public.orcamentos (user_id)
  where categoria_id is null;

-- ---------- Metas e aportes ----------
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  valor_alvo numeric(14, 2) not null check (valor_alvo > 0),
  prazo date,
  icone text not null default 'target',
  cor text not null default '#3987e5' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);
create index metas_user_idx on public.metas (user_id);

create table public.aportes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meta_id uuid not null references public.metas (id) on delete cascade,
  valor numeric(14, 2) not null check (valor <> 0),
  data date not null,
  observacao text not null default '' check (char_length(observacao) <= 200),
  created_at timestamptz not null default now()
);
create index aportes_meta_idx on public.aportes (meta_id);

-- ---------- RLS: dono lê, cria, edita e apaga ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'contas', 'cartoes', 'categorias', 'recorrentes', 'lancamentos', 'orcamentos', 'metas', 'aportes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "dono lê" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono cria" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono edita" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "dono apaga" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- ---------- Traz os lançamentos diários antigos para o modelo novo ----------
-- Cada dia antigo vira até dois lançamentos (entrada e saída) em uma conta "Carteira".
-- A tabela antiga (lancamentos_diarios) é mantida como estava.
do $$
declare
  u record;
  nova_conta uuid;
begin
  if to_regclass('public.lancamentos_diarios') is null then
    return;
  end if;
  for u in select distinct user_id from public.lancamentos_diarios loop
    insert into public.contas (user_id, nome, tipo) values (u.user_id, 'Carteira', 'dinheiro')
    returning id into nova_conta;

    insert into public.lancamentos (user_id, tipo, valor, data, descricao, conta_id, forma_pagamento)
    select user_id, 'receita', valor_receita, data, 'Entrada do dia', nova_conta, 'dinheiro'
    from public.lancamentos_diarios
    where user_id = u.user_id and valor_receita > 0;

    insert into public.lancamentos (user_id, tipo, valor, data, descricao, conta_id, forma_pagamento)
    select user_id, 'despesa', valor_despesa, data, 'Saída do dia', nova_conta, 'dinheiro'
    from public.lancamentos_diarios
    where user_id = u.user_id and valor_despesa > 0;
  end loop;
end;
$$;
