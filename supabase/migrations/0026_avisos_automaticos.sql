-- Avisos automáticos (recordatorios diarios): registro de los ya enviados para no repetirlos
create table if not exists public.avisos_enviados (
  clave text primary key,
  created_at timestamptz not null default now()
);
alter table public.avisos_enviados enable row level security;
-- Sin políticas: solo el servidor (clave de servicio) lee y escribe
