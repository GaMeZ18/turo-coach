-- ============================================================
-- Coach Manager CBTuró · Vídeo (fase 1): vídeos de YouTube, categorías y clips etiquetados
-- ============================================================
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  partido_id uuid references public.partidos(id) on delete set null,
  titulo text not null,
  url text not null,
  youtube_id text,
  rival text,
  notas text,
  creado_por uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists videos_equipo_idx on public.videos (equipo_id, created_at desc);
create index if not exists videos_partido_idx on public.videos (partido_id);

-- Botonera de etiquetas: las del club (equipo_id nulo) + las propias de cada equipo
create table if not exists public.video_categorias (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid references public.equipos(id) on delete cascade,
  nombre text not null,
  color text not null default '#002b8e',
  antes int not null default 8,    -- segundos antes del toque
  despues int not null default 4,  -- segundos después del toque
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.video_clips (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  categoria_id uuid references public.video_categorias(id) on delete set null,
  inicio numeric not null,
  fin numeric not null,
  jugador_id uuid references public.jugadores(id) on delete set null,
  resultado text check (resultado in ('bien', 'mal')),
  periodo int,
  nota text,
  creado_por uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists video_clips_video_idx on public.video_clips (video_id, inicio);

alter table public.videos enable row level security;
alter table public.video_categorias enable row level security;
alter table public.video_clips enable row level security;

drop policy if exists "videos: staff" on public.videos;
create policy "videos: staff" on public.videos for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));

drop policy if exists "video_categorias: leer" on public.video_categorias;
drop policy if exists "video_categorias: escribir" on public.video_categorias;
create policy "video_categorias: leer" on public.video_categorias for select to authenticated
  using (equipo_id is null or public.es_staff(equipo_id));
create policy "video_categorias: escribir" on public.video_categorias for all to authenticated
  using (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end)
  with check (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end);

drop policy if exists "video_clips: staff" on public.video_clips;
create policy "video_clips: staff" on public.video_clips for all to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and public.es_staff(v.equipo_id)))
  with check (exists (select 1 from public.videos v where v.id = video_id and public.es_staff(v.equipo_id)));

-- Categorías del club para empezar
insert into public.video_categorias (equipo_id, nombre, color, antes, despues, orden)
select null, x.nombre, x.color, x.antes, x.despues, x.orden from (values
  ('Ataque estático',    '#002b8e', 12, 4, 1),
  ('Transición ataque',  '#0f9d58', 8, 3, 2),
  ('Bloqueo directo',    '#3949ab', 10, 4, 3),
  ('Tiro de 3',          '#ef7d00', 6, 3, 4),
  ('Pérdida',            '#d6001c', 6, 3, 5),
  ('Rebote ofensivo',    '#00838f', 5, 4, 6),
  ('Defensa individual', '#455a64', 10, 3, 7),
  ('Defensa zona',       '#7b1fa2', 10, 3, 8),
  ('Transición defensa', '#c2185b', 8, 3, 9),
  ('Rebote defensivo',   '#6d4c41', 5, 4, 10),
  ('Falta',              '#b8860b', 5, 3, 11),
  ('Tiempo muerto',      '#558b2f', 3, 30, 12)
) as x(nombre, color, antes, despues, orden)
where not exists (select 1 from public.video_categorias where equipo_id is null);
