-- Base dos dois apps.
-- 1. Cada pessoa só lê e grava as próprias linhas (user_id = auth.uid()).
-- 2. Os dados de um app só abrem com a assinatura daquele app válida.
-- 3. Assinaturas só são gravadas pelas Edge Functions (servidor), nunca pelo navegador.

create schema if not exists private;

-- ---------- assinatura ----------

create table public.subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product in ('cobranca', 'sobra')),
  status text not null check (status in ('pendente', 'ativa', 'cancelada', 'reembolsada')),
  cycle text not null check (cycle in ('mensal', 'anual')),
  price_cents integer not null check (price_cents > 0),
  provider text not null check (provider in ('asaas', 'simulado')),
  guarantee_used boolean not null default false,
  invoice_url text,
  asaas_subscription_id text,
  first_payment_id text,
  last_payment_id text,
  access_until timestamptz,
  current_period_end timestamptz,
  paid_at timestamptz,
  refundable_until timestamptz,
  refunded_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, product)
);
create index subscriptions_asaas_idx on public.subscriptions (asaas_subscription_id) where asaas_subscription_id is not null;

-- Código da pessoa no Asaas. Só o servidor enxerga.
create table public.billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  asaas_customer_id text not null
);

-- Liga o pagamento simulado para testes. Só vale enquanto a chave do Asaas não estiver cadastrada.
create table public.payment_settings (
  id boolean primary key default true check (id),
  simulado boolean not null default false
);
insert into public.payment_settings default values;

-- A assinatura vale enquanto estiver ativa (ou cancelada, até o fim do período pago).
create function private.tem_acesso(p text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.product = p
      and s.status in ('ativa', 'cancelada')
      and s.access_until > now()
  );
$$;

-- ---------- app Cobrança ----------

create table public.cob_profile (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  niche text not null,
  display_name text not null,
  pix_key text not null,
  pix_name text not null,
  city text not null,
  primary key (user_id, id)
);

create table public.cob_templates (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (id in ('antes', 'dia', 'depois')),
  body text not null,
  primary key (user_id, id)
);

create table public.cob_clients (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  phone text not null,
  billing_type text not null check (billing_type in ('mensal', 'pacote', 'sessao')),
  amount_cents integer not null check (amount_cents >= 0),
  due_day integer check (due_day between 1 and 31),
  package_sessions integer,
  paused boolean not null default false,
  notes text,
  start_month text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.cob_charges (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  client_id text not null,
  kind text not null check (kind in ('mensal', 'pacote', 'sessao')),
  period text not null,
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,
  status text not null check (status in ('aberta', 'paga')),
  paid_at date,
  paid_method text,
  package_total integer,
  package_used integer not null default 0,
  reminded_antes date,
  reminded_dia date,
  reminded_depois date,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, client_id) references public.cob_clients (user_id, id) on delete cascade
);
create index cob_charges_client_idx on public.cob_charges (user_id, client_id);

create table public.cob_attendance (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  client_id text not null,
  charge_id text,
  date date not null,
  kind text not null check (kind in ('presenca', 'falta_avisada', 'falta')),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, client_id) references public.cob_clients (user_id, id) on delete cascade
);
create index cob_attendance_client_idx on public.cob_attendance (user_id, client_id);

-- ---------- app Sobra ----------

create table public.sob_profile (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  niche text not null,
  monthly_goal_cents integer not null,
  hours_per_week numeric not null,
  hours_per_month numeric not null,
  cylinder_cents integer not null,
  cylinder_hours numeric not null,
  gas_cost_per_hour_cents numeric not null,
  default_margin_pct numeric not null,
  primary key (user_id, id)
);

create table public.sob_ingredients (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  unit text not null,
  package_qty numeric not null,
  package_price_cents integer not null check (package_price_cents >= 0),
  previous_price_cents integer,
  previous_package_qty numeric,
  price_changed_at timestamptz,
  alert_seen boolean not null default true,
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.sob_products (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  yield_units numeric not null,
  packaging_cents integer not null default 0,
  gas_minutes numeric not null default 0,
  work_minutes numeric not null default 0,
  sale_price_cents integer,
  margin_pct numeric,
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.sob_orders (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  customer_name text not null,
  phone text,
  delivery_date date not null,
  delivery_time text,
  total_cents integer not null,
  deposit_cents integer not null default 0,
  status text not null check (status in ('aberta', 'paga', 'entregue')),
  notes text,
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- quem pode o quê ----------

alter table public.subscriptions enable row level security;
alter table public.billing enable row level security;
alter table public.payment_settings enable row level security;

revoke all on public.subscriptions, public.billing, public.payment_settings from anon, authenticated;
grant all on public.subscriptions, public.billing, public.payment_settings to service_role;
grant select on public.subscriptions to authenticated;

create policy "dono le a assinatura" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

do $$
declare
  t text;
  app text;
begin
  foreach t in array array[
    'cob_profile', 'cob_templates', 'cob_clients', 'cob_charges', 'cob_attendance',
    'sob_profile', 'sob_ingredients', 'sob_products', 'sob_orders'
  ] loop
    app := case when t like 'cob\_%' then 'cobranca' else 'sobra' end;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy "dono com assinatura" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id and (select private.tem_acesso(%L)))
         with check ((select auth.uid()) = user_id and (select private.tem_acesso(%L)))',
      t, app, app
    );
  end loop;
end;
$$;

revoke all on function private.tem_acesso(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.tem_acesso(text) to authenticated;

-- ---------- gravação em lote ----------

-- Várias gravações que dão certo ou errado juntas. Roda com a permissão de quem chamou,
-- então as regras acima continuam valendo. Cada item de ops:
--   { "op": "set" | "add" | "update" | "delete", "table": "...", "id": "...", "row": { coluna: valor } }
-- "set" cria ou substitui, "add" só cria se não existir, "update" muda só as colunas enviadas.
create function public.gravar_lote(ops jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  o jsonb;
  t text;
  r jsonb;
  cols text;
  sets text;
  n integer;
begin
  if uid is null then
    raise exception 'Entre na sua conta primeiro.' using errcode = '42501';
  end if;

  for o in select value from jsonb_array_elements(ops) loop
    t := o ->> 'table';
    if t is null or t not in (
      'cob_profile', 'cob_templates', 'cob_clients', 'cob_charges', 'cob_attendance',
      'sob_profile', 'sob_ingredients', 'sob_products', 'sob_orders'
    ) then
      raise exception 'Tabela inválida: %', t using errcode = '42501';
    end if;
    r := coalesce(o -> 'row', '{}'::jsonb) - 'user_id' - 'id';

    if o ->> 'op' = 'delete' then
      execute format('delete from public.%I where user_id = $1 and id = $2', t) using uid, o ->> 'id';

    elsif o ->> 'op' = 'update' then
      select string_agg(format('%1$I = x.%1$I', k), ', ') into sets from jsonb_object_keys(r) k;
      if sets is not null then
        execute format(
          'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) x where t.user_id = $2 and t.id = $3',
          t, sets
        ) using r, uid, o ->> 'id';
        get diagnostics n = row_count;
        if n = 0 then
          raise exception 'Não deu para gravar. Confira se a sua assinatura está ativa.' using errcode = '42501';
        end if;
      end if;

    elsif o ->> 'op' in ('set', 'add') then
      select string_agg(format('%1$I = excluded.%1$I', k), ', ') into sets from jsonb_object_keys(r) k;
      r := r || jsonb_build_object('user_id', uid, 'id', o ->> 'id');
      select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(r) k;
      execute format(
        'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, $1) on conflict (user_id, id) do %3$s',
        t, cols,
        case when o ->> 'op' = 'add' or sets is null then 'nothing' else 'update set ' || sets end
      ) using r;

    else
      raise exception 'Operação inválida: %', o ->> 'op' using errcode = '42501';
    end if;
  end loop;
end;
$$;

revoke all on function public.gravar_lote(jsonb) from public, anon;
grant execute on function public.gravar_lote(jsonb) to authenticated;

-- A tela de assinatura muda sozinha quando o pagamento é confirmado.
alter publication supabase_realtime add table public.subscriptions;
