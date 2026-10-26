-- ============================================================
-- Turó Coach · Plantillas de entrenamiento
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0007)
-- ============================================================
create table if not exists public.plantillas_entreno (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  equipo_id uuid references public.equipos(id) on delete cascade, -- null = del club (para todos)
  autor_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  duracion_prevista int not null default 90,
  actividades jsonb not null default '[]'::jsonb,              -- [{tipo, ejercicio_id, titulo, duracion, notas}]
  created_at timestamptz not null default now()
);
alter table public.plantillas_entreno enable row level security;
drop policy if exists "plantillas_entreno: leer" on public.plantillas_entreno;
drop policy if exists "plantillas_entreno: crear" on public.plantillas_entreno;
drop policy if exists "plantillas_entreno: editar" on public.plantillas_entreno;
create policy "plantillas_entreno: leer" on public.plantillas_entreno for select to authenticated
  using (equipo_id is null or public.es_staff(equipo_id) or autor_id = auth.uid());
create policy "plantillas_entreno: crear" on public.plantillas_entreno for insert to authenticated
  with check (autor_id = auth.uid() and (equipo_id is null or public.es_staff(equipo_id)));
create policy "plantillas_entreno: editar" on public.plantillas_entreno for all to authenticated
  using (autor_id = auth.uid() or public.es_coordinador());
