-- Equipos con mesa «en efectivo» (CEEB): la hace 1 persona y la pagan los jugadores (no cuenta en los pagos del club)
alter table public.equipos add column if not exists mesa_efectivo boolean not null default false;
