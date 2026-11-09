-- Los ejercicios «Solo yo» solo los ve su autor y la cuenta de Juan Gámez (antes los veía cualquier coordinador)
create or replace function public.ve_todos_los_ejercicios() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = '60fb55be-45e2-4f5d-addc-35aaf44b7610'::uuid;
$$;
drop policy if exists "ejercicios: leer" on public.ejercicios;
create policy "ejercicios: leer" on public.ejercicios for select to authenticated
  using (visibilidad = 'club' or autor_id = auth.uid() or public.ve_todos_los_ejercicios());
