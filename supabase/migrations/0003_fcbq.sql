-- ============================================================
-- Turó Coach · Enlace con la Federació (FCBQ) para importar partidos
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0002)
-- ============================================================

-- Cómo se llama cada equipo en la FCBQ (p. ej. "CB TURÓ U25") y su número allí
alter table public.equipos add column if not exists fcbq_nombre text;
alter table public.equipos add column if not exists fcbq_equipo_id text;

-- Número de partido de la FCBQ: evita duplicados al volver a importar
alter table public.partidos add column if not exists fcbq_id text;
create unique index if not exists partidos_fcbq_id_key on public.partidos (fcbq_id) where fcbq_id is not null;
