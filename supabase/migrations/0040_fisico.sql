-- Físico fuera de pista también al acabar, y ejercicios de físico (sin pizarra) con series, repeticiones y descanso
alter table public.entrenamientos add column if not exists fisico_fuera_fin int not null default 0;
alter table public.ejercicios drop constraint if exists ejercicios_tipo_check;
alter table public.ejercicios add constraint ejercicios_tipo_check check (tipo in ('ejercicio','sistema','fisico'));
alter table public.ejercicios add column if not exists series text;
alter table public.ejercicios add column if not exists repeticiones text;
alter table public.ejercicios add column if not exists descanso text;
-- ocupacion_pistas: la pista se ocupa entre el físico del principio y el del final
create or replace function public.ocupacion_pistas(desde timestamptz, hasta timestamptz)
returns table (id uuid, equipo_id uuid, fecha timestamptz, duracion int, lugar text, tipo text, detalle text)
language sql stable security definer set search_path = public as $$
  select e.id, e.equipo_id, e.fecha + make_interval(mins => coalesce(e.fisico_fuera, 0)),
    greatest(coalesce(e.duracion_prevista, 90) - coalesce(e.fisico_fuera, 0) - coalesce(e.fisico_fuera_fin, 0), 15), e.lugar, 'entreno', null::text
  from entrenamientos e
  where auth.uid() is not null and e.fecha >= desde - interval '1 hour' and e.fecha < hasta and coalesce(trim(e.lugar), '') <> ''
  union all
  select p.id, p.equipo_id, p.fecha, 105,
    coalesce(
      (select pi.nombre from pistas pi
        where translate(upper(coalesce(p.lugar, '')), 'ÀÁÈÉÍÏÒÓÚÜ', 'AAEEIIOOUU') like '%' || translate(upper(pi.nombre), 'ÀÁÈÉÍÏÒÓÚÜ', 'AAEEIIOOUU') || '%'
        order by length(pi.nombre) desc limit 1),
      case when eq.fcbq_nombre is not null then (select pi.nombre from pistas pi where pi.partidos_casa order by pi.orden limit 1) end
    ),
    'partido', p.rival
  from partidos p join equipos eq on eq.id = p.equipo_id
  where auth.uid() is not null and p.local and p.fecha >= desde and p.fecha < hasta;
$$;
grant execute on function public.ocupacion_pistas(timestamptz, timestamptz) to authenticated;
