-- Jornada de prueba del fantasy (equipos automáticos con la jornada anterior; se borran con un botón)
alter table public.fantasy_config add column if not exists prueba jsonb;
alter table public.fantasy_participantes add column if not exists prueba boolean not null default false;
