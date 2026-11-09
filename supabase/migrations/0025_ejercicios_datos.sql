-- Datos de cada ejercicio para poder filtrar: material, jugadores, focos, posiciones y tipo de trabajo
alter table public.ejercicios add column if not exists balones int;
alter table public.ejercicios add column if not exists canastas int;
alter table public.ejercicios add column if not exists conos int;
alter table public.ejercicios add column if not exists focos text[] not null default '{}';
alter table public.ejercicios add column if not exists posiciones text[] not null default '{}';
alter table public.ejercicios add column if not exists formato text;
create index if not exists ejercicios_focos on public.ejercicios using gin (focos);
create index if not exists ejercicios_posiciones on public.ejercicios using gin (posiciones);
create index if not exists ejercicios_edades on public.ejercicios using gin (edades);

-- Rellenar los que ya existen (biblioteca y los creados por los entrenadores) a partir de la pizarra,
-- la categoría, las etiquetas y el título. Las mismas reglas que src/lib/rasgos-ejercicio.ts.
with base as (
  select e.id,
    coalesce(e.pizarra->'elementos', '[]'::jsonb) els,
    e.pizarra->>'vista' vista,
    lower(coalesce(e.titulo,'') || ' ' || coalesce(e.categoria,'') || ' ' || array_to_string(e.etiquetas, ' ')) t,
    e.categoria, e.tipo, e.jugadores_min
  from public.ejercicios e
), c as (
  select b.*,
    (select count(*) from jsonb_array_elements(els) x where x->>'tipo' = 'balon')::int nbal,
    (select count(*) from jsonb_array_elements(els) x where x->>'tipo' in ('cono','chino','pica','valla'))::int ncon,
    (select count(*) from jsonb_array_elements(els) x where x->>'tipo' = 'canasta')::int ncan,
    (select count(*) from jsonb_array_elements(els) x where x->>'tipo' in ('atacante','defensor'))::int njug
  from base b
), r as (
  select c.id, nbal, ncon,
    case when ncan > 0 then ncan when vista = 'completa' then 2 else 1 end ncan,
    case when njug > 0 then njug else jugadores_min end njug,
    array_remove(array[
      case when categoria is not null and categoria <> '' then categoria end,
      case when t ~ '(tiro|tirador|triple|finaliz|bandeja|tiro libre)' then 'Tiro' end,
      case when t ~ 'rebote' then 'Rebote' end,
      case when t ~ '(defensa|defender|cierre|ayuda|shell|presión|negaci)' then 'Defensa' end,
      case when t ~ '(pase|pases)' then 'Pase' end,
      case when t ~ '(bote|manejo)' then 'Bote' end,
      case when t ~ '(transición|contraataque|toda la pista)' then 'Transición' end,
      case when t ~ 'calentamiento' then 'Calentamiento' end,
      case when t ~ '(físico|condición|fatiga)' then 'Físico' end,
      case when t ~ '(1c1|2c2|3c3|4c4|juego reducido)' then 'Juego reducido' end,
      case when t ~ '(atacar|ataque|bloqueo|poste|mano a mano)' then 'Ataque' end,
      case when tipo = 'sistema' then 'Sistema de juego' end
    ], null) focos,
    case
      when t ~ '(poste|interior|gancho|pívot|pivot)' then array['Ala-pívot','Pívot']
      when t ~ '(bloqueo directo|pick)' then array['Base','Escolta','Ala-pívot','Pívot']
      when coalesce(categoria,'') = 'Bote' then array['Base','Escolta','Alero']
      else array['Base','Escolta','Alero','Ala-pívot','Pívot'] end posiciones,
    case
      when tipo = 'sistema' or t ~ '5c5' or njug >= 10 then 'equipo'
      when t ~ '(filas|rueda|circuito|estrella|carriles|calentamiento)' and njug >= 4 then 'circuito'
      when njug <= 1 then 'individual'
      when njug = 2 then 'parejas'
      else 'reducido' end formato
  from c
)
update public.ejercicios e set
  balones = coalesce(e.balones, nullif(r.nbal, 0)),
  conos = coalesce(e.conos, r.ncon),
  canastas = coalesce(e.canastas, r.ncan),
  jugadores_min = coalesce(nullif(e.jugadores_min, 0), r.njug),
  focos = case when cardinality(e.focos) = 0 then (select array_agg(distinct f) from unnest(r.focos) f) else e.focos end,
  posiciones = case when cardinality(e.posiciones) = 0 then r.posiciones else e.posiciones end,
  formato = coalesce(e.formato, r.formato)
from r where r.id = e.id;
