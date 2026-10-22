-- ============================================================
-- Turó Coach · Scouting: estadísticas de la FCBQ, fichas de rivales y control de periodos
-- Solo el staff de cada equipo (y el coordinador) ve y edita lo de su equipo.
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0005)
-- ============================================================

-- Estadísticas de cada partido de la liga de un equipo (resumidas desde basquetcatala.cat)
create table if not exists public.fcbq_stats (
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  stats_id text not null,                 -- id de /estadistica/partit/<id>
  fecha timestamptz,
  local text,
  visitante text,
  datos jsonb not null,
  created_at timestamptz not null default now(),
  primary key (equipo_id, stats_id)
);

-- Ficha de cada rival (y del propio equipo)
create table if not exists public.scouting_rivales (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  nombre text not null,                   -- nombre del equipo en la FCBQ
  notas text,
  caracteristicas jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (equipo_id, nombre)
);

-- Ficha de cada jugador rival
create table if not exists public.scouting_jugadores (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  rival text not null,
  nombre text not null,
  dorsal text,
  notas text,
  caracteristicas jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (equipo_id, rival, nombre)
);

-- Control de periodos: qué periodos juega cada jugador en cada partido
create table if not exists public.partido_periodos (
  partido_id uuid references public.partidos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  periodos int[] not null default '{}',
  primary key (partido_id, jugador_id)
);

alter table public.partidos add column if not exists fcbq_stats_id text;
alter table public.partidos add column if not exists num_periodos int;

alter table public.fcbq_stats enable row level security;
alter table public.scouting_rivales enable row level security;
alter table public.scouting_jugadores enable row level security;
alter table public.partido_periodos enable row level security;

drop policy if exists "fcbq_stats: staff" on public.fcbq_stats;
drop policy if exists "scouting_rivales: staff" on public.scouting_rivales;
drop policy if exists "scouting_jugadores: staff" on public.scouting_jugadores;
drop policy if exists "partido_periodos: staff" on public.partido_periodos;
create policy "fcbq_stats: staff" on public.fcbq_stats for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));
create policy "scouting_rivales: staff" on public.scouting_rivales for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));
create policy "scouting_jugadores: staff" on public.scouting_jugadores for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));
create policy "partido_periodos: staff" on public.partido_periodos for all to authenticated
  using (public.es_staff((select equipo_id from partidos p where p.id = partido_id)))
  with check (public.es_staff((select equipo_id from partidos p where p.id = partido_id)));
