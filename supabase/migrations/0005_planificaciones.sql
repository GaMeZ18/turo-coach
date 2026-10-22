-- ============================================================
-- Turó Coach · Planificaciones (árbol de objetivos) y objetivos de cada entreno
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0004)
-- ============================================================

create table if not exists public.planificaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  equipo_id uuid references public.equipos(id) on delete cascade, -- null = del club (plantilla para todos)
  temporada_id uuid references public.temporadas(id) on delete set null,
  autor_id uuid default auth.uid() references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  planificacion_id uuid not null references public.planificaciones(id) on delete cascade,
  padre_id uuid references public.objetivos(id) on delete cascade,
  nombre text not null,
  descripcion text,
  color text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.entreno_objetivos (
  entrenamiento_id uuid references public.entrenamientos(id) on delete cascade,
  objetivo_id uuid references public.objetivos(id) on delete cascade,
  primary key (entrenamiento_id, objetivo_id)
);

create index if not exists objetivos_plan_idx on public.objetivos (planificacion_id, padre_id, orden);
create index if not exists entreno_objetivos_obj_idx on public.entreno_objetivos (objetivo_id);

-- ¿Puedo editar esta planificación? Del club → coordinador; de un equipo → su staff
create or replace function public.puede_planificacion(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case when p.equipo_id is null then public.es_coordinador() else public.es_staff(p.equipo_id) end
    from planificaciones p where p.id = pid
  ), false);
$$;

alter table public.planificaciones enable row level security;
alter table public.objetivos enable row level security;
alter table public.entreno_objetivos enable row level security;

drop policy if exists "planificaciones: leer" on public.planificaciones;
drop policy if exists "planificaciones: escribir" on public.planificaciones;
create policy "planificaciones: leer" on public.planificaciones for select to authenticated using (true);
create policy "planificaciones: escribir" on public.planificaciones for all to authenticated
  using (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end)
  with check (case when equipo_id is null then public.es_coordinador() else public.es_staff(equipo_id) end);

drop policy if exists "objetivos: leer" on public.objetivos;
drop policy if exists "objetivos: escribir" on public.objetivos;
create policy "objetivos: leer" on public.objetivos for select to authenticated using (true);
create policy "objetivos: escribir" on public.objetivos for all to authenticated
  using (public.puede_planificacion(planificacion_id)) with check (public.puede_planificacion(planificacion_id));

drop policy if exists "entreno_objetivos: leer" on public.entreno_objetivos;
drop policy if exists "entreno_objetivos: staff" on public.entreno_objetivos;
create policy "entreno_objetivos: leer" on public.entreno_objetivos for select to authenticated using (true);
create policy "entreno_objetivos: staff" on public.entreno_objetivos for all to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)))
  with check (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));
