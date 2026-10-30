-- Vídeos guardados en el ordenador del entrenador (no se suben): solo se apunta el nombre y el tamaño del archivo
alter table videos alter column url drop not null;
alter table videos add column if not exists archivo text;
alter table videos add column if not exists archivo_bytes bigint;
