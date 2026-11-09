-- Mesas de partidos que no vienen de la federación (se añaden a mano): 1 persona, sin importe (la pagan los jugadores)
create table if not exists public.mesa_partidos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null,
  equipo_id uuid references public.equipos(id) on delete set null,
  equipo_nombre text not null,
  rival text not null,
  lugar text,
  created_at timestamptz not null default now()
);
create index if not exists mesa_partidos_fecha on public.mesa_partidos (fecha);
alter table public.mesa_partidos enable row level security;
drop policy if exists "mesas: gestor" on public.mesa_partidos;
create policy "mesas: gestor" on public.mesa_partidos for all to authenticated using (public.gestiona_mesas()) with check (public.gestiona_mesas());

-- Las asignaciones pueden ser de un partido de la federación o de uno añadido a mano
alter table public.mesa_asignaciones drop constraint if exists mesa_asignaciones_partido_id_fkey;
create or replace function public.borrar_mesas_del_partido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from mesa_asignaciones where partido_id = old.id;
  return old;
end $$;
drop trigger if exists borrar_mesas on public.partidos;
create trigger borrar_mesas after delete on public.partidos for each row execute function public.borrar_mesas_del_partido();
drop trigger if exists borrar_mesas on public.mesa_partidos;
create trigger borrar_mesas after delete on public.mesa_partidos for each row execute function public.borrar_mesas_del_partido();
