-- GBFinanças: gestão compartilhada (casal, família).
-- Quem cria a família ("dono") convida até 4 pessoas por link. Os membros passam a ler e
-- gravar nas finanças do dono, cada um com a própria conta de acesso. Cada pessoa participa
-- de no máximo uma família. Os dados pessoais do membro continuam guardados e voltam quando
-- ele sai da família.

create table public.membros (
  dono uuid not null references auth.users (id) on delete cascade,
  membro uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  criado_em timestamptz not null default now(),
  primary key (dono, membro),
  check (dono <> membro)
);

alter table public.membros enable row level security;
revoke all on public.membros from anon, authenticated;
grant select on public.membros to authenticated;
create policy "dono e membro leem" on public.membros
  for select to authenticated
  using ((select auth.uid()) in (dono, membro));

-- Convites: só existem pelo link; ninguém lê a tabela pela API.
create table public.convites (
  codigo text primary key,
  dono uuid not null references auth.users (id) on delete cascade,
  expira_em timestamptz not null default now() + interval '7 days',
  criado_em timestamptz not null default now()
);
alter table public.convites enable row level security;
revoke all on public.convites from anon, authenticated;

-- A pessoa logada é membro da família de `alvo`? (por fora do RLS, sempre filtrando por ela)
create or replace function public.e_membro_de(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m where m.dono = alvo and m.membro = (select auth.uid())
  );
$$;
revoke all on function public.e_membro_de(uuid) from public, anon;
grant execute on function public.e_membro_de(uuid) to authenticated;

-- Membros leem e gravam nas tabelas do dono.
do $$
declare
  t text;
begin
  foreach t in array array[
    'contas', 'cartoes', 'categorias', 'recorrentes', 'lancamentos', 'orcamentos', 'metas', 'aportes'
  ]
  loop
    execute format(
      'create policy "família lê" on public.%I for select to authenticated using (public.e_membro_de(user_id))', t);
    execute format(
      'create policy "família cria" on public.%I for insert to authenticated with check (public.e_membro_de(user_id))', t);
    execute format(
      'create policy "família edita" on public.%I for update to authenticated using (public.e_membro_de(user_id)) with check (public.e_membro_de(user_id))', t);
    execute format(
      'create policy "família apaga" on public.%I for delete to authenticated using (public.e_membro_de(user_id))', t);
  end loop;
end;
$$;

-- A subcategoria pode ficar sob uma categoria da família.
create or replace function public.categoria_e_minha(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.categorias c
    where c.id = alvo and (c.user_id = (select auth.uid()) or public.e_membro_de(c.user_id))
  );
$$;

-- Quem lançou cada gasto.
alter table public.lancamentos
  add column criado_por uuid default auth.uid() references auth.users (id) on delete set null;

-- ---------- Funções usadas pelo app ----------

create or replace function public.criar_convite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  novo text := replace(gen_random_uuid()::text, '-', '');
begin
  if eu is null then raise exception 'Entre de novo.'; end if;
  if exists (select 1 from public.membros where membro = eu) then
    raise exception 'Quem participa da família de outra pessoa não pode convidar.';
  end if;
  if (select count(*) from public.membros where dono = eu) >= 4 then
    raise exception 'A família já tem 5 pessoas.';
  end if;
  delete from public.convites where dono = eu and expira_em < now();
  insert into public.convites (codigo, dono) values (novo, eu);
  return novo;
end;
$$;

create or replace function public.aceitar_convite(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  v_dono uuid;
begin
  if eu is null then raise exception 'Entre de novo.'; end if;
  select dono into v_dono from public.convites where codigo = p_codigo and expira_em > now();
  if v_dono is null then raise exception 'Convite inválido ou vencido.'; end if;
  if v_dono = eu then raise exception 'Este convite é seu. Envie o link para quem vai participar.'; end if;
  if exists (select 1 from public.membros where membro = eu) then
    raise exception 'Você já participa de uma família. Saia dela antes de aceitar outra.';
  end if;
  if exists (select 1 from public.membros where dono = eu) then
    raise exception 'Você tem pessoas na sua família. Remova-as antes de entrar em outra.';
  end if;
  if (select count(*) from public.membros where dono = v_dono) >= 4 then
    raise exception 'Esta família já tem 5 pessoas.';
  end if;
  insert into public.membros (dono, membro, email)
  values (v_dono, eu, (select email from auth.users where id = eu));
  delete from public.convites where codigo = p_codigo;
  return (select email from auth.users where id = v_dono);
end;
$$;

create or replace function public.remover_membro(p_membro uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.membros where dono = (select auth.uid()) and membro = p_membro;
$$;

create or replace function public.sair_da_familia()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.membros where membro = (select auth.uid());
$$;

-- A família de quem está logado: o dono e cada membro, com e-mail.
create or replace function public.minha_familia()
returns table (dono uuid, dono_email text, membro uuid, membro_email text)
language sql
stable
security definer
set search_path = ''
as $$
  with espaco as (
    select coalesce(
      (select m.dono from public.membros m where m.membro = (select auth.uid())),
      (select auth.uid())
    ) as dono
  )
  select e.dono, u.email::text, m.membro, m.email
  from espaco e
  join auth.users u on u.id = e.dono
  left join public.membros m on m.dono = e.dono;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'criar_convite()', 'aceitar_convite(text)', 'remover_membro(uuid)', 'sair_da_familia()', 'minha_familia()'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
