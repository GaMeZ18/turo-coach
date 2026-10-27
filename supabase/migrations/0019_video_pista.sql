-- ============================================================
-- Coach Manager CBTuró · Vídeo: quinteto en pista, fin de cuarto y puntos del rival
-- (para minutos, +/- y quintetos sacados del propio vídeo)
-- ============================================================
alter table public.videos add column if not exists minutos_periodo int not null default 10;

create table if not exists public.video_eventos (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  t numeric not null,                        -- segundo del vídeo
  tipo text not null check (tipo in ('quinteto', 'fin_periodo', 'rival')),
  periodo int,
  jugadores uuid[],                          -- quinteto: los que están en pista desde este momento
  puntos int,                                -- rival: 1, 2 o 3
  created_at timestamptz not null default now()
);
create index if not exists video_eventos_video_idx on public.video_eventos (video_id, t);
alter table public.video_eventos enable row level security;
drop policy if exists "video_eventos: staff" on public.video_eventos;
create policy "video_eventos: staff" on public.video_eventos for all to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and public.es_staff(v.equipo_id)))
  with check (exists (select 1 from public.videos v where v.id = video_id and public.es_staff(v.equipo_id)));
