-- Imágenes de los ejercicios de prep. física (reducidas en el móvil antes de guardarlas, como data URL)
alter table public.ejercicios add column if not exists imagenes text[] not null default '{}';
