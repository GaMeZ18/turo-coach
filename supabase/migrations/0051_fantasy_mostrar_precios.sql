-- Nombre visible pequeño ("Juan G.") y precios fijados al abrir cada jornada
alter table public.fantasy_participantes add column if not exists mostrar text;
create table if not exists public.fantasy_precios (
  jornada date primary key,
  precios jsonb not null,           -- { "<jugador>": [precio, media|null, pj] }
  created_at timestamptz not null default now()
);
alter table public.fantasy_precios enable row level security;
