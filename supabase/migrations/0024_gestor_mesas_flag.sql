-- El gestor de mesas deja de ser un rol: es un permiso extra (puede ser también entrenador o coordinador)
alter table public.perfiles add column if not exists gestor_mesas boolean not null default false;
update public.perfiles set gestor_mesas = true, rol = 'entrenador' where rol = 'gestor_mesas';
create or replace function public.gestiona_mesas() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and (rol in ('coordinador', 'gestor_mesas') or gestor_mesas));
$$;
-- Que nadie pueda darse a sí mismo el permiso de mesas desde su perfil
create or replace function public.proteger_gestor_mesas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.gestor_mesas is distinct from old.gestor_mesas and auth.uid() is not null and not public.es_coordinador() then
    new.gestor_mesas := old.gestor_mesas;
  end if;
  return new;
end $$;
drop trigger if exists proteger_gestor_mesas on public.perfiles;
create trigger proteger_gestor_mesas before update on public.perfiles for each row execute function public.proteger_gestor_mesas();
