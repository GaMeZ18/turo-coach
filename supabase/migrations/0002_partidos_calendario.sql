-- ============================================================
-- Turó Coach · Partidos, convocatorias y eventos del calendario
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0001)
-- ============================================================

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  fecha timestamptz not null,
  rival text not null,
  local boolean not null default true,          -- true = en casa
  lugar text,
  competicion text,                             -- "Liga", "Copa", "Amistoso"...
  jornada int,
  puntos_favor int,
  puntos_contra int,
  estado text not null default 'programado' check (estado in ('programado', 'jugado', 'aplazado')),
  notas text,
  creado_por uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.convocatorias (
  partido_id uuid references public.partidos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  primary key (partido_id, jugador_id)
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid references public.equipos(id) on delete cascade, -- null = evento de todo el club
  titulo text not null,
  tipo text not null default 'evento' check (tipo in ('evento', 'reunion', 'torneo', 'otro')),
  fecha timestamptz not null,
  lugar text,
  descripcion text,
  creado_por uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.partidos (equipo_id, fecha);
create index on public.eventos (fecha);

alter table public.partidos enable row level security;
alter table public.convocatorias enable row level security;
alter table public.eventos enable row level security;

-- Partidos: todo el staff lee; el staff del equipo (o el coordinador) escribe
create policy "partidos: leer" on public.partidos for select to authenticated using (true);
create policy "partidos: staff" on public.partidos for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));

create policy "convocatorias: leer" on public.convocatorias for select to authenticated using (true);
create policy "convocatorias: staff" on public.convocatorias for all to authenticated
  using (public.es_staff((select equipo_id from partidos p where p.id = partido_id)))
  with check (public.es_staff((select equipo_id from partidos p where p.id = partido_id)));

-- Eventos: del equipo → su staff; del club (sin equipo) → coordinador
create policy "eventos: leer" on public.eventos for select to authenticated using (true);
create policy "eventos: escribir" on public.eventos for all to authenticated
  using (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end)
  with check (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end);
