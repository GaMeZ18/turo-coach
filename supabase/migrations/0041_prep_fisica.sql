-- Categoría «Prep. física» en la sesión. La pista se ocupa desde el primer ejercicio que no es de prep. física
-- hasta el último: la prep. física del principio y del final (o los ejercicios de tipo físico) no cuentan como pista.
-- Si la sesión no tiene actividades, se usan los minutos puestos a mano (fisico_fuera / fisico_fuera_fin).
alter table public.entreno_actividades drop constraint if exists entreno_actividades_tipo_check;
alter table public.entreno_actividades add constraint entreno_actividades_tipo_check check (tipo in ('ejercicio','calentamiento','estiramientos','series','agua','nota','prep_fisica'));
create or replace function public.ocupacion_pistas(desde timestamptz, hasta timestamptz)
returns table (id uuid, equipo_id uuid, fecha timestamptz, duracion int, lugar text, tipo text, detalle text)
language sql stable security definer set search_path = public as $$
  select e.id, e.equipo_id,
    e.fecha + make_interval(mins => case when act.total > 0 then act.ini else coalesce(e.fisico_fuera, 0) end),
    greatest(coalesce(e.duracion_prevista, 90)
      - case when act.total > 0 then act.ini else coalesce(e.fisico_fuera, 0) end
      - case when act.total > 0 then act.fin else coalesce(e.fisico_fuera_fin, 0) end, 15),
    e.lugar, 'entreno', null::text
  from entrenamientos e
  left join lateral (
    select count(*) as total,
      count(*) filter (where not x.fis) as pista,
      coalesce(sum(x.duracion) filter (where x.fis and x.orden < coalesce(x.primer, 2147483647)), 0)::int as ini,
      coalesce(sum(x.duracion) filter (where x.fis and x.primer is not null and x.orden > x.ultimo), 0)::int as fin
    from (
      select y.*, min(y.orden) filter (where not y.fis) over () as primer, max(y.orden) filter (where not y.fis) over () as ultimo
      from (
        select ea.orden, coalesce(ea.duracion, 0) as duracion,
          (ea.tipo = 'prep_fisica' or exists (select 1 from ejercicios j where j.id = ea.ejercicio_id and j.tipo = 'fisico')) as fis
        from entreno_actividades ea where ea.entrenamiento_id = e.id
      ) y
    ) x
  ) act on true
  where auth.uid() is not null and e.fecha >= desde - interval '1 hour' and e.fecha < hasta and coalesce(trim(e.lugar), '') <> ''
    and not (act.total > 0 and act.pista = 0)
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
