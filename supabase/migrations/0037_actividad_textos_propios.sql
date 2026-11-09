-- Objetivos y descripción cambiados solo para un entreno (el ejercicio de la biblioteca no se toca)
alter table public.entreno_actividades add column if not exists objetivos text;
alter table public.entreno_actividades add column if not exists descripcion text;
