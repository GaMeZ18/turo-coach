-- ocupacion_pistas devuelve también la hora real del entreno (para enseñarla) y si llega a usar la pista.
-- fecha/duracion siguen siendo el rato en pista (sin la prep. física del principio y del final): con eso se buscan choques.
drop function if exists public.ocupacion_pistas(timestamptz, timestamptz);
create function public.ocupacion_pistas(desde timestamptz, hasta timestamptz)
returns table (id uuid, equipo_id uuid, fecha timestamptz, duracion int, lugar text, tipo text, detalle text, real_fecha timestamptz, real_duracion int, en_pista boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.equipo_id,
    e.fecha + make_interval(mins => case when act.total > 0 then act.ini else coalesce(e.fisico_fuera, 0) end),
    greatest(coalesce(e.duracion_prevista, 90)
      - case when act.total > 0 then act.ini else coalesce(e.fisico_fuera, 0) end
      - case when act.total > 0 then act.fin else coalesce(e.fisico_fuera_fin, 0) end, 15),
    e.lugar, 'entreno', null::text,
    e.fecha, coalesce(e.duracion_prevista, 90), not (act.total > 0 and act.pista = 0)
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
  where auth.uid() is not null and e.fecha >= desde and e.fecha < hasta and coalesce(trim(e.lugar), '') <> ''
  union all
  select p.id, p.equipo_id, p.fecha, 105,
    coalesce(
      (select pi.nombre from pistas pi
        where translate(upper(coalesce(p.lugar, '')), 'ÀÁÈÉÍÏÒÓÚÜ', 'AAEEIIOOUU') like '%' || translate(upper(pi.nombre), 'ÀÁÈÉÍÏÒÓÚÜ', 'AAEEIIOOUU') || '%'
        order by length(pi.nombre) desc limit 1),
      case when eq.fcbq_nombre is not null then (select pi.nombre from pistas pi where pi.partidos_casa order by pi.orden limit 1) end
    ),
    'partido', p.rival, p.fecha, 105, true
  from partidos p join equipos eq on eq.id = p.equipo_id
  where auth.uid() is not null and p.local and p.fecha >= desde and p.fecha < hasta;
$$;
grant execute on function public.ocupacion_pistas(timestamptz, timestamptz) to authenticated;
