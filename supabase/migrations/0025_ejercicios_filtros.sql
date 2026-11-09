-- ============================================================
-- Coach Manager CBTuró · Datos de cada ejercicio para poder filtrar
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0024)
--
-- Solo AÑADE columnas nuevas (no toca ni borra nada). Los ejercicios que ya
-- existen quedan con estos campos vacíos hasta que el coordinador pulse
-- «Completar datos de los ejercicios» en la Biblioteca.
-- ============================================================

-- Para qué sirve: calentamiento, tiro, rebote, defensa… (uno o varios)
alter table public.ejercicios add column if not exists enfoques text[] not null default '{}';
-- Posiciones que lo usan: Base, Escolta, Alero, Ala-pívot, Pívot (vacío = todas)
alter table public.ejercicios add column if not exists posiciones text[] not null default '{}';
-- Cómo se trabaja: individual, grupos (parejas, tríos…) o equipo (todo el equipo)
alter table public.ejercicios add column if not exists modalidad text;
-- Jugadores: ya existía jugadores_min; ahora también un máximo
alter table public.ejercicios add column if not exists jugadores_max int;
-- Material necesario (cuántos hacen falta)
alter table public.ejercicios add column if not exists balones int;
alter table public.ejercicios add column if not exists canastas int;
alter table public.ejercicios add column if not exists conos int;
alter table public.ejercicios add column if not exists petos int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ejercicios_modalidad_check') then
    alter table public.ejercicios
      add constraint ejercicios_modalidad_check check (modalidad is null or modalidad in ('individual', 'grupos', 'equipo'));
  end if;
end $$;

create index if not exists ejercicios_enfoques_idx on public.ejercicios using gin (enfoques);
create index if not exists ejercicios_posiciones_idx on public.ejercicios using gin (posiciones);
