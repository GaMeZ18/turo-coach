-- Fantasy: las alineaciones de los demás están ocultas hasta el cierre de fichajes.
-- Espiar a un equipo durante los fichajes cuesta 4 ⭐ del presupuesto de esa jornada.
create table if not exists public.fantasy_espias (
  participante_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  objetivo_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  jornada date not null,
  created_at timestamptz not null default now(),
  primary key (participante_id, objetivo_id, jornada)
);
alter table public.fantasy_espias enable row level security;
