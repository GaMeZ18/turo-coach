-- ============================================================
-- Turó Coach · Previa del partido (plan y sistemas) 
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0008)
-- ============================================================
alter table public.partidos add column if not exists previa text;

create table if not exists public.partido_ejercicios (
  partido_id uuid references public.partidos(id) on delete cascade,
  ejercicio_id uuid references public.ejercicios(id) on delete cascade,
  orden int not null default 0,
  primary key (partido_id, ejercicio_id)
);
alter table public.partido_ejercicios enable row level security;
drop policy if exists "partido_ejercicios: leer" on public.partido_ejercicios;
drop policy if exists "partido_ejercicios: staff" on public.partido_ejercicios;
create policy "partido_ejercicios: leer" on public.partido_ejercicios for select to authenticated using (true);
create policy "partido_ejercicios: staff" on public.partido_ejercicios for all to authenticated
  using (public.es_staff((select equipo_id from partidos p where p.id = partido_id)))
  with check (public.es_staff((select equipo_id from partidos p where p.id = partido_id)));
