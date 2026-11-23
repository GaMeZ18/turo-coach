-- Torneos organizados por el club. De momento solo los ve y gestiona la cuenta de Juan Gámez (ve_torneos()).
-- La página pública /t/<token> se sirve desde el servidor (adminClient), solo si el torneo es público.
create or replace function public.ve_torneos() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = '60fb55be-45e2-4f5d-addc-35aaf44b7610'::uuid;
$$;

create table if not exists public.torneos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  fecha_inicio date,
  fecha_fin date,
  lugar text,
  formato text not null default 'grupos' check (formato in ('liga', 'grupos', 'eliminatoria')),
  num_grupos int not null default 2 check (num_grupos between 1 and 16),
  clasifican int not null default 2 check (clasifican between 1 and 16),   -- por grupo, a la eliminatoria
  ida_vuelta boolean not null default false,
  tercer_puesto boolean not null default true,
  puntos_victoria int not null default 2,
  puntos_derrota int not null default 1,
  duracion int not null default 60,          -- minutos por partido (para el horario)
  notas text,
  publico boolean not null default false,
  token text not null default substr(md5(gen_random_uuid()::text), 1, 18) unique,
  created_at timestamptz not null default now()
);

create table if not exists public.torneo_equipos (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  nombre text not null,
  club text,
  grupo text,                                -- 'A', 'B'… (null en liga/eliminatoria)
  cabeza int,                                -- orden de siembra (1 = mejor)
  created_at timestamptz not null default now()
);
create index if not exists torneo_equipos_torneo_idx on public.torneo_equipos(torneo_id);

create table if not exists public.torneo_partidos (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.torneos(id) on delete cascade,
  fase text not null default 'grupo' check (fase in ('grupo', 'eliminatoria')),
  grupo text,
  ronda int not null default 1,              -- jornada (grupo) o ronda del cuadro (1 = primera)
  orden int not null default 0,              -- posición dentro de la ronda del cuadro
  tercer_puesto boolean not null default false,
  local_id uuid references public.torneo_equipos(id) on delete set null,
  visitante_id uuid references public.torneo_equipos(id) on delete set null,
  fecha timestamptz,
  pista text,
  puntos_local int check (puntos_local >= 0),
  puntos_visitante int check (puntos_visitante >= 0),
  created_at timestamptz not null default now()
);
create index if not exists torneo_partidos_torneo_idx on public.torneo_partidos(torneo_id);

alter table public.torneos enable row level security;
alter table public.torneo_equipos enable row level security;
alter table public.torneo_partidos enable row level security;
drop policy if exists "torneos: todo" on public.torneos;
create policy "torneos: todo" on public.torneos for all to authenticated using (public.ve_torneos()) with check (public.ve_torneos());
drop policy if exists "torneo_equipos: todo" on public.torneo_equipos;
create policy "torneo_equipos: todo" on public.torneo_equipos for all to authenticated using (public.ve_torneos()) with check (public.ve_torneos());
drop policy if exists "torneo_partidos: todo" on public.torneo_partidos;
create policy "torneo_partidos: todo" on public.torneo_partidos for all to authenticated using (public.ve_torneos()) with check (public.ve_torneos());
