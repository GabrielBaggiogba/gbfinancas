-- GBFinanças: planos de assinatura, perfil do usuário e lista de espera.
-- 1) `perfis`: uma linha por conta, com o plano e as preferências de aviso (e-mail e WhatsApp).
--    O plano e o telefone só mudam pelo servidor (chave service_role): a pessoa não consegue
--    se dar um plano nem vincular o número de outra pessoa.
-- 2) Todas as contas que já existem viram "fundador": acesso total, sem cobrança.
-- 3) `lista_espera`: quem quer assinar quando a cobrança abrir. Qualquer um insere; ninguém lê
--    pela API (só o painel do Supabase).

create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plano text check (plano in ('fundador', 'essencial', 'completo', 'familia')),
  telefone text unique check (telefone ~ '^\d{10,15}$'),
  whatsapp_codigo text,
  whatsapp_codigo_expira timestamptz,
  avisos_email boolean not null default true,
  avisos_whatsapp boolean not null default true,
  antecedencia_dias smallint not null default 2 check (antecedencia_dias between 0 and 15),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (avisos_email, avisos_whatsapp, antecedencia_dias) on public.perfis to authenticated;

create policy "dono lê" on public.perfis
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "dono edita preferências" on public.perfis
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Conta nova ganha um perfil sem plano (o plano vem da assinatura, quando a cobrança abrir).
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger criar_perfil
after insert on auth.users
for each row execute function public.criar_perfil();

-- Contas atuais: fundadoras, com acesso total.
insert into public.perfis (user_id, plano)
select id, 'fundador' from auth.users
on conflict (user_id) do update set plano = 'fundador';

-- ---------- Lista de espera ----------
create table public.lista_espera (
  id bigint generated always as identity primary key,
  email text not null unique check (char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  plano text check (plano in ('essencial', 'completo', 'familia')),
  criado_em timestamptz not null default now()
);

alter table public.lista_espera enable row level security;
revoke all on public.lista_espera from anon, authenticated;
grant insert (email, plano) on public.lista_espera to anon, authenticated;

create policy "qualquer um entra na lista" on public.lista_espera
  for insert to anon, authenticated
  with check (true);
