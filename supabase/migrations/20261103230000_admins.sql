-- Quem pode abrir a tela de administrador. Sem regra de acesso: só o servidor lê esta tabela.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
