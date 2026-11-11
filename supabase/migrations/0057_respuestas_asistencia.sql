-- Enlace de asistencia por equipo, respuestas de los jugadores y «no disponible hasta…»
alter table equipos add column if not exists asistencia_token text unique;
alter table jugadores add column if not exists no_disponible_hasta date, add column if not exists no_disponible_motivo text;

create table if not exists respuestas_asistencia (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(id) on delete cascade,
  entrenamiento_id uuid references entrenamientos(id) on delete cascade,
  partido_id uuid references partidos(id) on delete cascade,
  va boolean not null,
  motivo_tipo text check (motivo_tipo in ('lesion','enfermo','estudios','viaje','otro')),
  motivo text,
  updated_at timestamptz not null default now(),
  check ((entrenamiento_id is null) <> (partido_id is null))
);
create unique index if not exists respuestas_asistencia_entreno on respuestas_asistencia(jugador_id, entrenamiento_id) where entrenamiento_id is not null;
create unique index if not exists respuestas_asistencia_partido on respuestas_asistencia(jugador_id, partido_id) where partido_id is not null;
create index if not exists respuestas_asistencia_e on respuestas_asistencia(entrenamiento_id);
create index if not exists respuestas_asistencia_p on respuestas_asistencia(partido_id);
alter table respuestas_asistencia enable row level security;
create policy "respuestas: leer staff" on respuestas_asistencia for select using (
  case when entrenamiento_id is not null then es_staff((select e.equipo_id from entrenamientos e where e.id = entrenamiento_id))
  else es_staff((select p.equipo_id from partidos p where p.id = partido_id)) end
);
