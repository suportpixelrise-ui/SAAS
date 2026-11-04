-- Assinaturas pagas na Cakto. O token vai no link do checkout e volta no aviso de pagamento:
-- é ele que liga a compra à conta, sem passar dado pessoal pelo link.

alter table public.subscriptions drop constraint subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('asaas', 'simulado', 'cakto'));

alter table public.subscriptions
  add column checkout_token text,
  add column cakto_subscription_id text;

create unique index subscriptions_checkout_token_idx on public.subscriptions (checkout_token) where checkout_token is not null;
create index subscriptions_cakto_idx on public.subscriptions (cakto_subscription_id) where cakto_subscription_id is not null;
