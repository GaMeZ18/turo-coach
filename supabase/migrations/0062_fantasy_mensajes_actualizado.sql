-- Chat del Fantasy incremental: saber cuándo cambió cada mensaje (nuevo, reacción o borrado)
alter table fantasy_mensajes add column if not exists actualizado timestamptz not null default now();
update fantasy_mensajes set actualizado = created_at;
create index if not exists fantasy_mensajes_jornada_act on fantasy_mensajes(jornada, actualizado desc);
