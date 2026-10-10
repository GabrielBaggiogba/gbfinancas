-- GBFinanças: registro de auditoria e limite de gravações.
-- Cada comando que grava em uma tabela do app deixa uma linha em `auditoria` (quem, onde,
-- o quê, quantas linhas). O mesmo registro serve de contador: passou de 600 comandos em um
-- minuto, o banco recusa os próximos. Como fica no banco, vale também para quem chama a
-- API do Supabase direto, sem passar pelo site.

create table public.auditoria (
  id bigint generated always as identity primary key,
  -- Sem chave estrangeira de propósito: o registro continua depois que a conta é excluída.
  user_id uuid,
  tabela text not null,
  operacao text not null,
  linhas integer not null,
  criado_em timestamptz not null default now()
);
create index auditoria_user_idx on public.auditoria (user_id, criado_em desc);

-- A pessoa só lê o próprio registro; ninguém grava, edita ou apaga pela API.
alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;
create policy "dono lê" on public.auditoria
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.limitar_gravacoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := (select auth.uid());
begin
  -- Sem usuário (migrations, SQL Editor, service_role) não há limite.
  if quem is not null and (
    select count(*) from public.auditoria a
    where a.user_id = quem and a.criado_em > now() - interval '1 minute'
  ) >= 600 then
    raise exception 'Muitas alterações em pouco tempo.' using errcode = 'GB429';
  end if;
  return null;
end;
$$;

create or replace function public.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  if tg_op = 'DELETE' then
    select count(*) into total from antigas;
  else
    select count(*) into total from novas;
  end if;
  insert into public.auditoria (user_id, tabela, operacao, linhas)
  values ((select auth.uid()), tg_table_name, tg_op, total);
  return null;
end;
$$;

revoke all on function public.limitar_gravacoes() from public, anon, authenticated;
revoke all on function public.auditar() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'contas', 'cartoes', 'categorias', 'recorrentes', 'lancamentos', 'orcamentos', 'metas', 'aportes'
  ]
  loop
    execute format(
      'create trigger limite before insert or update or delete on public.%I for each statement execute function public.limitar_gravacoes()', t);
    execute format(
      'create trigger auditoria_insere after insert on public.%I referencing new table as novas for each statement execute function public.auditar()', t);
    execute format(
      'create trigger auditoria_edita after update on public.%I referencing new table as novas for each statement execute function public.auditar()', t);
    execute format(
      'create trigger auditoria_apaga after delete on public.%I referencing old table as antigas for each statement execute function public.auditar()', t);
  end loop;
end;
$$;

-- A exclusão da conta também fica registrada.
create or replace function public.excluir_minha_conta()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.auditoria (user_id, tabela, operacao, linhas)
  values ((select auth.uid()), 'auth.users', 'DELETE', 1);
  delete from auth.users where id = (select auth.uid());
$$;
