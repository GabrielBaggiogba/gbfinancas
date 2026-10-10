-- GBFinanças: reforço de segurança.
-- 1) As policies conferiam só o dono da linha; uma linha podia apontar para a conta, o
--    cartão, a categoria, a meta ou o recorrente de outra pessoa (chave estrangeira não
--    passa por RLS). Agora a referência precisa ser de quem grava: a subconsulta roda
--    com o RLS da tabela referenciada, que só mostra as linhas do próprio usuário.
-- 2) Função para a pessoa excluir a própria conta de acesso (os dados caem em cascata).

-- A policy de categorias não pode consultar a própria tabela (recursão); esta função
-- faz a conferência da categoria-mãe por fora do RLS, sempre filtrando pelo dono.
create or replace function public.categoria_e_minha(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.categorias c where c.id = alvo and c.user_id = (select auth.uid())
  );
$$;

revoke all on function public.categoria_e_minha(uuid) from public, anon;
grant execute on function public.categoria_e_minha(uuid) to authenticated;

do $$
declare
  regra record;
begin
  for regra in
    select * from (values
      ('categorias',
       'pai_id is null or public.categoria_e_minha(pai_id)'),
      ('recorrentes',
       '(categoria_id is null or exists (select 1 from public.categorias x where x.id = categoria_id))
        and (conta_id is null or exists (select 1 from public.contas x where x.id = conta_id))
        and (cartao_id is null or exists (select 1 from public.cartoes x where x.id = cartao_id))'),
      ('lancamentos',
       '(categoria_id is null or exists (select 1 from public.categorias x where x.id = categoria_id))
        and (conta_id is null or exists (select 1 from public.contas x where x.id = conta_id))
        and (conta_destino_id is null or exists (select 1 from public.contas x where x.id = conta_destino_id))
        and (cartao_id is null or exists (select 1 from public.cartoes x where x.id = cartao_id))
        and (recorrente_id is null or exists (select 1 from public.recorrentes x where x.id = recorrente_id))'),
      ('orcamentos',
       'categoria_id is null or exists (select 1 from public.categorias x where x.id = categoria_id)'),
      ('aportes',
       'exists (select 1 from public.metas x where x.id = meta_id)')
    ) as r (tabela, condicao)
  loop
    execute format(
      'create policy "referências do dono (cria)" on public.%I as restrictive for insert to authenticated with check (%s)',
      regra.tabela, regra.condicao);
    execute format(
      'create policy "referências do dono (edita)" on public.%I as restrictive for update to authenticated using (true) with check (%s)',
      regra.tabela, regra.condicao);
  end loop;
end;
$$;

create or replace function public.excluir_minha_conta()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
