-- Mesas de partido: rol «gestor de mesas», personas que hacen mesa (sin cuenta), apuntados por partido y pagos.

alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('coordinador', 'entrenador', 'gestor_mesas'));

create or replace function public.gestiona_mesas() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol in ('coordinador', 'gestor_mesas'));
$$;

-- Equipos con mesa federada (la pone la federación: no hacen falta personas del club)
alter table public.equipos add column if not exists mesa_federada boolean not null default false;

create table if not exists public.mesa_personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists mesa_personas_telefono on public.mesa_personas (telefono) where telefono is not null;

create table if not exists public.mesa_asignaciones (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  persona_id uuid not null references public.mesa_personas(id) on delete cascade,
  estado text not null default 'candidato' check (estado in ('candidato', 'confirmado')),
  importe numeric(6,2) not null default 10,
  created_at timestamptz not null default now(),
  unique (partido_id, persona_id)
);

create table if not exists public.mesa_pagos (
  persona_id uuid not null references public.mesa_personas(id) on delete cascade,
  mes text not null,               -- 'YYYY-MM'
  importe numeric(8,2) not null,
  pagado_en timestamptz not null default now(),
  primary key (persona_id, mes)
);

-- Enlace público para apuntarse (token secreto que se puede cambiar)
create table if not exists public.mesa_config (
  id boolean primary key default true check (id),
  token text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  importe numeric(6,2) not null default 10
);
insert into public.mesa_config (id) values (true) on conflict do nothing;

alter table public.mesa_personas enable row level security;
alter table public.mesa_asignaciones enable row level security;
alter table public.mesa_pagos enable row level security;
alter table public.mesa_config enable row level security;
drop policy if exists "mesas: gestor" on public.mesa_personas;
create policy "mesas: gestor" on public.mesa_personas for all to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());
drop policy if exists "mesas: gestor" on public.mesa_asignaciones;
create policy "mesas: gestor" on public.mesa_asignaciones for all to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());
drop policy if exists "mesas: gestor" on public.mesa_pagos;
create policy "mesas: gestor" on public.mesa_pagos for all to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());
drop policy if exists "mesas: gestor" on public.mesa_config;
create policy "mesas: gestor" on public.mesa_config for all to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());

-- El gestor puede marcar qué equipos tienen mesa federada
drop policy if exists "equipos: gestor mesas" on public.equipos;
create policy "equipos: gestor mesas" on public.equipos for update to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());

update public.equipos e set mesa_federada = true
from public.temporadas t
where t.id = e.temporada_id and t.actual and e.nombre in ('SENIOR A MASC', 'SENIOR A FEM', 'U25 MASC');
