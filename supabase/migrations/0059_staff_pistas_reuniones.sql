-- Cambios de pista (los aprueba coordinación), reuniones de staff con tareas, guía de bienvenida y accesos de Inicio
create table if not exists solicitudes_pista (
  id uuid primary key default gen_random_uuid(),
  entrenamiento_id uuid not null references entrenamientos(id) on delete cascade,
  solicitante_id uuid references perfiles(id) on delete set null,
  nueva_fecha timestamptz,
  nuevo_lugar text,
  intercambio_id uuid references entrenamientos(id) on delete cascade,
  todas_semanas boolean not null default false,
  motivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada','cancelada')),
  respuesta text,
  resuelto_por uuid references perfiles(id) on delete set null,
  resuelto_en timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists solicitudes_pista_estado on solicitudes_pista(estado, created_at desc);
alter table solicitudes_pista enable row level security;
create policy "solicitudes pista: leer" on solicitudes_pista for select using (
  es_coordinador() or solicitante_id = auth.uid()
  or es_staff((select e.equipo_id from entrenamientos e where e.id = entrenamiento_id))
  or (intercambio_id is not null and es_staff((select e.equipo_id from entrenamientos e where e.id = intercambio_id)))
);

create table if not exists reuniones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha timestamptz not null,
  lugar text,
  orden_dia text,
  acta text,
  asistentes uuid[] not null default '{}',
  creado_por uuid references perfiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table reuniones enable row level security;
create policy "reuniones: leer" on reuniones for select using (es_coordinador() or auth.uid() = any(asistentes) or creado_por = auth.uid());
create policy "reuniones: crear" on reuniones for insert with check (es_coordinador());
create policy "reuniones: editar" on reuniones for update using (es_coordinador() or auth.uid() = any(asistentes) or creado_por = auth.uid());
create policy "reuniones: borrar" on reuniones for delete using (es_coordinador() or creado_por = auth.uid());

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  reunion_id uuid references reuniones(id) on delete cascade,
  titulo text not null,
  responsable_id uuid references perfiles(id) on delete set null,
  fecha_limite date,
  hecha boolean not null default false,
  hecha_en timestamptz,
  creado_por uuid references perfiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists tareas_responsable on tareas(responsable_id, hecha);
alter table tareas enable row level security;
create policy "tareas: leer" on tareas for select using (
  es_coordinador() or responsable_id = auth.uid() or creado_por = auth.uid()
  or (reunion_id is not null and exists (select 1 from reuniones r where r.id = reunion_id and (auth.uid() = any(r.asistentes) or r.creado_por = auth.uid())))
);
create policy "tareas: crear" on tareas for insert with check (
  es_coordinador() or (reunion_id is not null and exists (select 1 from reuniones r where r.id = reunion_id and (auth.uid() = any(r.asistentes) or r.creado_por = auth.uid())))
);
create policy "tareas: editar" on tareas for update using (es_coordinador() or responsable_id = auth.uid() or creado_por = auth.uid());
create policy "tareas: borrar" on tareas for delete using (es_coordinador() or creado_por = auth.uid());

alter table perfiles add column if not exists bienvenida_vista boolean not null default false, add column if not exists inicio jsonb;
update perfiles set bienvenida_vista = true;
