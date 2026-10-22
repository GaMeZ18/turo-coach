-- ============================================================
-- Turó Coach · Liga de la FCBQ de cada equipo (resultados de toda la liga y clasificación)
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0003)
-- ============================================================

create table if not exists public.ligas_fcbq (
  equipo_id uuid primary key references public.equipos(id) on delete cascade,
  nombre text,                                   -- nombre de la competición
  url text,                                      -- página de Resultats en basquetcatala.cat
  resultados jsonb not null default '[]'::jsonb, -- todos los partidos de la liga
  clasificacion jsonb,                           -- tabla oficial, si se ha enviado
  updated_at timestamptz not null default now()
);

alter table public.ligas_fcbq enable row level security;

drop policy if exists "ligas_fcbq: leer" on public.ligas_fcbq;
drop policy if exists "ligas_fcbq: staff" on public.ligas_fcbq;
create policy "ligas_fcbq: leer" on public.ligas_fcbq for select to authenticated using (true);
create policy "ligas_fcbq: staff" on public.ligas_fcbq for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));
