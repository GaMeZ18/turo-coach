-- ============================================================
-- Turó Coach · Biblioteca de ejercicios del club
-- Ejecutar en Supabase → SQL Editor (una sola vez, después de 0006)
-- ============================================================
alter table public.ejercicios add column if not exists en_biblioteca boolean not null default false;
alter table public.ejercicios add column if not exists edades text[] not null default '{}';
alter table public.ejercicios add column if not exists material text;
create index if not exists ejercicios_biblioteca_idx on public.ejercicios (en_biblioteca) where en_biblioteca;
