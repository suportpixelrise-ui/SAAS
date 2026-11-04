-- Acha a conta pelo e-mail da compra. Só o servidor chama: pelo navegador, serviria para descobrir quem tem conta.

create function public.conta_por_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke all on function public.conta_por_email(text) from public, anon, authenticated;
grant execute on function public.conta_por_email(text) to service_role;
