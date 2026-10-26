-- ============================================================
-- Coach Manager CBTuró · Los partidos en casa también ocupan pista
-- (TRÈVOL por defecto; los equipos no federados, como SCEEB, solo si su partido indica una pista del club)
-- ============================================================
alter table public.pistas add column if not exists partidos_casa boolean not null default false;
update public.pistas set partidos_casa = true where nombre = 'TRÈVOL';

drop function if exists public.ocupacion_pistas(timestamptz, timestamptz);
create or replace function public.ocupacion_pistas(desde timestamptz, hasta timestamptz)
returns table (id uuid, equipo_id uuid, fecha timestamptz, duracion int, lugar text, tipo text, detalle text)
language sql stable security definer set search_path = public as $$
  select e.id, e.equipo_id, e.fecha, e.duracion_prevista, e.lugar, 'entreno', null::text
  from entrenamientos e
  where auth.uid() is not null and e.fecha >= desde and e.fecha < hasta and coalesce(trim(e.lugar), '') <> ''
  union all
  select p.id, p.equipo_id, p.fecha, 105,  -- los partidos en casa van cada 1 h 45
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
