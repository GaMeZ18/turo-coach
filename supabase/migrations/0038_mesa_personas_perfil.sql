-- Persona de mesas que también usa la app: sus avisos de mesa le llegan a la app y al móvil de su cuenta
alter table public.mesa_personas add column if not exists perfil_id uuid references public.perfiles(id) on delete set null;
