-- ============================================================
-- Coach Manager CBTuró · Pistas del club (reparto de horarios)
-- ============================================================
create table if not exists public.pistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  capacidad int not null default 1 check (capacidad between 1 and 6),  -- equipos a la vez
  orden int not null default 0,
  notas text,
  created_at timestamptz not null default now()
);
alter table public.pistas enable row level security;
drop policy if exists "pistas: leer" on public.pistas;
drop policy if exists "pistas: coordinador" on public.pistas;
create policy "pistas: leer" on public.pistas for select to authenticated using (true);
create policy "pistas: coordinador" on public.pistas for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());

-- Las pistas que ya se usan en los entrenos
insert into public.pistas (nombre, orden)
select distinct upper(trim(lugar)), 0 from public.entrenamientos where coalesce(trim(lugar), '') <> ''
on conflict (nombre) do nothing;

-- Ocupación de las pistas (todos los equipos, solo hora y pista) para que cualquier entrenador vea el reparto
create or replace function public.ocupacion_pistas(desde timestamptz, hasta timestamptz)
returns table (id uuid, equipo_id uuid, fecha timestamptz, duracion int, lugar text)
language sql stable security definer set search_path = public as $$
  select e.id, e.equipo_id, e.fecha, e.duracion_prevista, e.lugar
  from entrenamientos e
  where auth.uid() is not null and e.fecha >= desde and e.fecha < hasta and coalesce(trim(e.lugar), '') <> '';
$$;
grant execute on function public.ocupacion_pistas(timestamptz, timestamptz) to authenticated;
