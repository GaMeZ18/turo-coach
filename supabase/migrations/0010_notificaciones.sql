-- ============================================================
-- Turó Coach · Notificaciones (en la app y en el móvil/ordenador)
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0009)
-- ============================================================
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  equipo_id uuid references public.equipos(id) on delete cascade,
  titulo text not null,
  cuerpo text,
  url text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notificaciones_perfil_idx on public.notificaciones (perfil_id, leida, created_at desc);

create table if not exists public.push_suscripciones (
  endpoint text primary key,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.notificaciones enable row level security;
alter table public.push_suscripciones enable row level security;
drop policy if exists "notificaciones: mias" on public.notificaciones;
drop policy if exists "push: mias" on public.push_suscripciones;
create policy "notificaciones: mias" on public.notificaciones for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy "push: mias" on public.push_suscripciones for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- Avisar al cuerpo técnico de un equipo (y a los coordinadores). Devuelve sus dispositivos para el aviso push.
create or replace function public.notificar_equipo(eq uuid, p_titulo text, p_cuerpo text, p_url text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff(eq) then return; end if;
  insert into notificaciones (perfil_id, equipo_id, titulo, cuerpo, url)
  select distinct x.id, eq, p_titulo, p_cuerpo, p_url from (
    select perfil_id as id from equipo_staff where equipo_id = eq
    union select id from perfiles where rol = 'coordinador'
  ) x;
  return query
    select s.endpoint, s.p256dh, s.auth from push_suscripciones s
    where s.perfil_id in (select perfil_id from equipo_staff where equipo_id = eq union select id from perfiles where rol = 'coordinador');
end $$;

-- Quitar un dispositivo que ya no acepta avisos
create or replace function public.borrar_suscripcion(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_suscripciones where endpoint = p_endpoint;
$$;
