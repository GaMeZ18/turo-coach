-- ============================================================
-- Turó Coach · Cada entrenador ve solo lo de sus equipos
-- (el calendario del club y los partidos siguen visibles para todos)
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0010)
-- ============================================================

-- Jugadores: los ve el staff de algún equipo donde juegan, el coordinador, o nadie los tiene aún (recién creados)
drop policy if exists "jugadores: leer" on public.jugadores;
create policy "jugadores: leer" on public.jugadores for select to authenticated using (
  public.es_coordinador()
  or exists (select 1 from equipo_jugadores ej where ej.jugador_id = id and public.es_staff(ej.equipo_id))
  or not exists (select 1 from equipo_jugadores ej where ej.jugador_id = id)
);

drop policy if exists "plantilla: leer" on public.equipo_jugadores;
create policy "plantilla: leer" on public.equipo_jugadores for select to authenticated using (public.es_staff(equipo_id));

-- Entrenamientos, sesión, asistencia y objetivos: solo su staff
drop policy if exists "entrenos: leer" on public.entrenamientos;
create policy "entrenos: leer" on public.entrenamientos for select to authenticated using (public.es_staff(equipo_id));

drop policy if exists "actividades: leer" on public.entreno_actividades;
drop policy if exists "actividades: leer staff" on public.entreno_actividades;
drop policy if exists "asistencias: leer" on public.asistencias;
drop policy if exists "asistencias: leer staff" on public.asistencias;
create policy "actividades: leer staff" on public.entreno_actividades for select to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));
create policy "asistencias: leer staff" on public.asistencias for select to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));

drop policy if exists "entreno_objetivos: leer" on public.entreno_objetivos;
create policy "entreno_objetivos: leer" on public.entreno_objetivos for select to authenticated
  using (public.es_staff((select equipo_id from entrenamientos e where e.id = entrenamiento_id)));

-- Convocatorias y periodos: solo su staff (el partido en sí sigue visible para el calendario)
drop policy if exists "convocatorias: leer" on public.convocatorias;
create policy "convocatorias: leer" on public.convocatorias for select to authenticated
  using (public.es_staff((select equipo_id from partidos p where p.id = partido_id)));
drop policy if exists "partido_ejercicios: leer" on public.partido_ejercicios;
create policy "partido_ejercicios: leer" on public.partido_ejercicios for select to authenticated
  using (public.es_staff((select equipo_id from partidos p where p.id = partido_id)));

-- Planificaciones de un equipo: su staff (las del club, todos)
drop policy if exists "planificaciones: leer" on public.planificaciones;
create policy "planificaciones: leer" on public.planificaciones for select to authenticated
  using (equipo_id is null or public.es_staff(equipo_id));
