-- Avisos del fantasy en los móviles de quien se registró sin cuenta de la app
create table if not exists public.fantasy_push (
  endpoint text primary key,
  participante_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.fantasy_push enable row level security;
