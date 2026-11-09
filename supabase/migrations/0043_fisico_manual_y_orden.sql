-- Actividades con orden repetido: se renumeran (la prep. física empatada va detrás).
-- Pista ocupada: cuenta lo mayor entre la prep. física de la sesión y los minutos puestos a mano (al empezar y al acabar).
with r as (
  select id, row_number() over (partition by entrenamiento_id order by orden, (tipo = 'prep_fisica'), id) - 1 as nuevo
  from entreno_actividades
)
update entreno_actividades a set orden = r.nuevo from r where r.id = a.id and a.orden is distinct from r.nuevo
  and a.entrenamiento_id in (select entrenamiento_id from entreno_actividades group by entrenamiento_id, orden having count(*) > 1);
-- (ocupacion_pistas: ver la versión aplicada en Supabase; misma que 0042 con greatest() y orden con desempate)
