-- ============================================================
-- Turó Coach · esquema inicial (fase 1 + pizarra)
-- Ejecutar en Supabase → SQL Editor (una sola vez)
-- ============================================================

-- ---------- Perfiles y roles ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  rol text not null default 'entrenador' check (rol in ('coordinador', 'entrenador')),
  created_at timestamptz not null default now()
);

-- Al crear un usuario en Auth se crea su perfil. El primero es coordinador.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfiles) then 'entrenador' else 'coordinador' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();

create or replace function public.es_coordinador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'coordinador');
$$;

-- ---------- Temporadas y equipos ----------
create table public.temporadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,               -- "2026-27"
  actual boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  nombre text not null,               -- "Infantil A"
  categoria text,                     -- "Infantil", "Mini"...
  congelado boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.equipo_staff (
  equipo_id uuid references public.equipos(id) on delete cascade,
  perfil_id uuid references public.perfiles(id) on delete cascade,
  funcion text not null default 'entrenador',  -- entrenador, ayudante, delegado
  primary key (equipo_id, perfil_id)
);

create or replace function public.es_staff(eq uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_coordinador()
      or exists (select 1 from equipo_staff where equipo_id = eq and perfil_id = auth.uid());
$$;

-- ---------- Jugadores ----------
-- El jugador es la persona; la pertenencia a un equipo va en equipo_jugadores,
-- así se puede pasar de un equipo a otro de temporada en temporada.
create table public.jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text,
  fecha_nacimiento date,
  contacto text,                      -- teléfono / email de contacto (familia)
  notas text,
  created_at timestamptz not null default now()
);

create table public.equipo_jugadores (
  equipo_id uuid references public.equipos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  dorsal int,
  posicion text,
  primary key (equipo_id, jugador_id)
);

-- ---------- Ejercicios y sistemas ----------
create table public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  tipo text not null default 'ejercicio' check (tipo in ('ejercicio', 'sistema')),
  titulo text not null,
  descripcion text,
  correcciones text,
  categoria text,                     -- Ataque, Defensa, Tiro, Físico...
  etiquetas text[] not null default '{}',
  jugadores_min int,
  duracion int,                       -- minutos
  video_url text,
  pizarra jsonb,                      -- ver src/components/pizarra/tipos.ts
  preview text,                       -- PNG (data URL) de la última fase
  visibilidad text not null default 'club' check (visibilidad in ('privado', 'club')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Entrenamientos ----------
create table public.entrenamientos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  fecha timestamptz not null,
  titulo text,
  duracion_prevista int not null default 90,  -- minutos
  lugar text,
  notas text,
  creado_por uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.entreno_actividades (
  id uuid primary key default gen_random_uuid(),
  entrenamiento_id uuid not null references public.entrenamientos(id) on delete cascade,
  orden int not null default 0,
  tipo text not null default 'ejercicio'
    check (tipo in ('ejercicio', 'calentamiento', 'estiramientos', 'series', 'agua', 'nota')),
  ejercicio_id uuid references public.ejercicios(id) on delete set null,
  titulo text,
  duracion int not null default 10,
  notas text
);

create table public.asistencias (
  entrenamiento_id uuid references public.entrenamientos(id) on delete cascade,
  jugador_id uuid references public.jugadores(id) on delete cascade,
  estado text not null default 'presente'
    check (estado in ('presente', 'ausente', 'justificado', 'lesionado', 'tarde')),
  motivo text,
  primary key (entrenamiento_id, jugador_id)
);

create index on public.equipos (temporada_id);
create index on public.entrenamientos (equipo_id, fecha);
create index on public.entreno_actividades (entrenamiento_id, orden);
create index on public.ejercicios (autor_id);

-- ============================================================
-- Seguridad (RLS)
-- Todo el staff del club puede LEER equipos, jugadores y entrenos.
-- Solo el coordinador o el staff del equipo pueden MODIFICARLOS.
-- ============================================================
alter table public.perfiles enable row level security;
alter table public.temporadas enable row level security;
alter table public.equipos enable row level security;
alter table public.equipo_staff enable row level security;
alter table public.jugadores enable row level security;
alter table public.equipo_jugadores enable row level security;
alter table public.ejercicios enable row level security;
alter table public.entrenamientos enable row level security;
alter table public.entreno_actividades enable row level security;
alter table public.asistencias enable row level security;

-- Perfiles
create policy "perfiles: leer" on public.perfiles for select to authenticated using (true);
create policy "perfiles: editar el propio" on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and rol = (select rol from perfiles where id = auth.uid()));
create policy "perfiles: coordinador gestiona" on public.perfiles for update to authenticated
  using (public.es_coordinador());

-- Temporadas
create policy "temporadas: leer" on public.temporadas for select to authenticated using (true);
create policy "temporadas: coordinador" on public.temporadas for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

-- Equipos
create policy "equipos: leer" on public.equipos for select to authenticated using (true);
create policy "equipos: crear/borrar coordinador" on public.equipos for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());
create policy "equipos: staff edita" on public.equipos for update to authenticated
  using (public.es_staff(id) and not congelado);

-- Staff
create policy "staff: leer" on public.equipo_staff for select to authenticated using (true);
create policy "staff: coordinador" on public.equipo_staff for all to authenticated
  using (public.es_coordinador()) with check (public.es_coordinador());

-- Jugadores (persona): lectura para todos, alta para cualquier entrenador,
-- edición si eres staff de algún equipo donde juega (o coordinador).
create policy "jugadores: leer" on public.jugadores for select to authenticated using (true);
create policy "jugadores: crear" on public.jugadores for insert to authenticated with check (true);
create policy "jugadores: editar" on public.jugadores for update to authenticated using (
  public.es_coordinador() or exists (
    select 1 from equipo_jugadores ej where ej.jugador_id = id and public.es_staff(ej.equipo_id)));
create policy "jugadores: borrar" on public.jugadores for delete to authenticated
  using (public.es_coordinador());

create policy "plantilla: leer" on public.equipo_jugadores for select to authenticated using (true);
create policy "plantilla: staff" on public.equipo_jugadores for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));

-- Ejercicios: ves los del club y los tuyos; editas los tuyos (coordinador: todos)
create policy "ejercicios: leer" on public.ejercicios for select to authenticated
  using (visibilidad = 'club' or autor_id = auth.uid() or public.es_coordinador());
create policy "ejercicios: crear" on public.ejercicios for insert to authenticated
  with check (autor_id = auth.uid());
create policy "ejercicios: editar" on public.ejercicios for update to authenticated
  using (autor_id = auth.uid() or public.es_coordinador());
create policy "ejercicios: borrar" on public.ejercicios for delete to authenticated
  using (autor_id = auth.uid() or public.es_coordinador());

-- Entrenamientos y dependientes
create policy "entrenos: leer" on public.entrenamientos for select to authenticated using (true);
create policy "entrenos: staff" on public.entrenamientos for all to authenticated
  using (public.es_staff(equipo_id)) with check (public.es_staff(equipo_id));

create policy "actividades: leer" on public.entreno_actividades for select to authenticated using (true);
create policy "actividades: staff" on public.entreno_actividades for all to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)))
  with check (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));

create policy "asistencias: leer" on public.asistencias for select to authenticated using (true);
create policy "asistencias: staff" on public.asistencias for all to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)))
  with check (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));

-- Temporada inicial
insert into public.temporadas (nombre, actual) values ('2026-27', true);
