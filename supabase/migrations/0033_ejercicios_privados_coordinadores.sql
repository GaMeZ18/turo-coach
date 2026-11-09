-- Los coordinadores vuelven a ver también los ejercicios «Solo yo» (para revisar entrenos)
drop policy if exists "ejercicios: leer" on public.ejercicios;
create policy "ejercicios: leer" on public.ejercicios for select to authenticated
  using (visibilidad = 'club' or autor_id = auth.uid() or public.es_coordinador() or public.ve_todos_los_ejercicios());
