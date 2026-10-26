-- ============================================================
-- Coach Manager CBTuró · Objetivos de cada ejercicio
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0011)
-- ============================================================
alter table public.ejercicios add column if not exists objetivos text;
