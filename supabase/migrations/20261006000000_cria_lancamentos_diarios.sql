-- GBFinanças: um registro por usuário por dia (entrada e saída).

create table public.lancamentos_diarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  valor_receita numeric(12, 2) not null default 0,
  valor_despesa numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lancamentos_diarios_user_data_key unique (user_id, data),
  constraint lancamentos_diarios_receita_faixa check (valor_receita >= 0 and valor_receita <= 99999999.99),
  constraint lancamentos_diarios_despesa_faixa check (valor_despesa >= 0 and valor_despesa <= 99999999.99)
);

comment on table public.lancamentos_diarios is
  'Entrada e saída de cada dia por usuário. O índice único (user_id, data) atende o upsert e a consulta dos últimos 30 dias.';

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

create trigger lancamentos_diarios_updated_at
before update on public.lancamentos_diarios
for each row execute function public.set_updated_at();

alter table public.lancamentos_diarios enable row level security;

revoke all on public.lancamentos_diarios from anon;
grant select, insert, update, delete on public.lancamentos_diarios to authenticated;

create policy "dono lê" on public.lancamentos_diarios
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "dono cria" on public.lancamentos_diarios
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "dono edita" on public.lancamentos_diarios
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "dono apaga" on public.lancamentos_diarios
  for delete to authenticated
  using ((select auth.uid()) = user_id);
