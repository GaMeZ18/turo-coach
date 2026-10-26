-- ============================================================
-- Coach Manager CBTuró · Vídeo: teclas propias y etiquetas que hacen estadística
-- ============================================================
alter table public.video_categorias add column if not exists tecla text check (tecla is null or length(tecla) = 1);
alter table public.video_categorias add column if not exists estadistica text check (estadistica in ('t2', 't3', 'tl', 'perdida'));
update public.video_categorias set tecla = 'F' where equipo_id is null and nombre = 'Falta';
update public.video_categorias set tecla = 'T' where equipo_id is null and nombre = 'Tiempo muerto';
update public.video_categorias set tecla = '3', estadistica = 't3' where equipo_id is null and nombre = 'Tiro de 3';
update public.video_categorias set tecla = 'P', estadistica = 'perdida' where equipo_id is null and nombre = 'Pérdida';
insert into public.video_categorias (equipo_id, nombre, color, antes, despues, orden, tecla, estadistica)
select null, 'Tiro de 2', '#f4a300', 6, 3, 4, '2', 't2' where not exists (select 1 from public.video_categorias where equipo_id is null and nombre = 'Tiro de 2');
insert into public.video_categorias (equipo_id, nombre, color, antes, despues, orden, tecla, estadistica)
select null, 'Tiro libre', '#9e9d24', 3, 3, 5, 'L', 'tl' where not exists (select 1 from public.video_categorias where equipo_id is null and nombre = 'Tiro libre');
