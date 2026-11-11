-- Seguimiento del jugador (solo staff): notas privadas y objetivos individuales; van con el jugador de una temporada a otra
create or replace function ve_jugador(j uuid) returns boolean language sql stable security definer set search_path = public as $$
  select es_coordinador() or exists (select 1 from equipo_jugadores ej where ej.jugador_id = j and es_staff(ej.equipo_id));
$$;

create table if not exists jugador_notas (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(id) on delete cascade,
  autor_id uuid references perfiles(id) on delete set null default auth.uid(),
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists jugador_notas_j on jugador_notas(jugador_id, created_at desc);
alter table jugador_notas enable row level security;
create policy "notas jugador: leer" on jugador_notas for select using (ve_jugador(jugador_id));
create policy "notas jugador: crear" on jugador_notas for insert with check (ve_jugador(jugador_id) and autor_id = auth.uid());
create policy "notas jugador: borrar" on jugador_notas for delete using (autor_id = auth.uid() or es_coordinador());

create table if not exists jugador_objetivos (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(id) on delete cascade,
  autor_id uuid references perfiles(id) on delete set null default auth.uid(),
  texto text not null,
  estado text not null default 'en_curso' check (estado in ('en_curso','conseguido','descartado')),
  cerrado_en timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists jugador_objetivos_j on jugador_objetivos(jugador_id, created_at desc);
alter table jugador_objetivos enable row level security;
create policy "objetivos jugador: leer" on jugador_objetivos for select using (ve_jugador(jugador_id));
create policy "objetivos jugador: crear" on jugador_objetivos for insert with check (ve_jugador(jugador_id));
create policy "objetivos jugador: editar" on jugador_objetivos for update using (ve_jugador(jugador_id));
create policy "objetivos jugador: borrar" on jugador_objetivos for delete using (ve_jugador(jugador_id));
