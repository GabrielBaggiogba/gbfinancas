-- Dados de exemplo (opcional). Só funciona depois de criar uma conta no app,
-- porque usa o primeiro usuário de auth.users. Pode rodar mais de uma vez.

insert into public.lancamentos_diarios (user_id, data, valor_receita, valor_despesa)
select
  (select id from auth.users order by created_at limit 1),
  (current_date - d)::date,
  case when d % 3 = 0 then 0 else (100 + (d * 37) % 250)::numeric(12, 2) end,
  (20 + (d * 53) % 180)::numeric(12, 2)
from generate_series(0, 13) as d
where exists (select 1 from auth.users)
on conflict (user_id, data) do nothing;
