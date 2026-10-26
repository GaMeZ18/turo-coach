-- ============================================================
-- Coach Manager CBTuró · Vídeo: estadística completa (rebotes, asistencias, robos, tapones, faltas)
-- ============================================================
alter table public.video_categorias drop constraint if exists video_categorias_estadistica_check;
alter table public.video_categorias add constraint video_categorias_estadistica_check
  check (estadistica in ('t2', 't3', 'tl', 'perdida', 'ro', 'rd', 'as', 'rob', 'tap', 'fc'));
update public.video_categorias set estadistica = 'ro', tecla = 'O' where equipo_id is null and nombre = 'Rebote ofensivo';
update public.video_categorias set estadistica = 'rd', tecla = 'D' where equipo_id is null and nombre = 'Rebote defensivo';
update public.video_categorias set estadistica = 'fc' where equipo_id is null and nombre = 'Falta';
insert into public.video_categorias (equipo_id, nombre, color, antes, despues, orden, tecla, estadistica)
select null, x.nombre, x.color, x.antes, x.despues, x.orden, x.tecla, x.est from (values
  ('Asistencia', '#2e7d32', 6, 3, 6, 'A', 'as'),
  ('Robo', '#1565c0', 5, 4, 7, 'R', 'rob'),
  ('Tapón', '#5d4037', 5, 3, 8, 'B', 'tap')
) as x(nombre, color, antes, despues, orden, tecla, est)
where not exists (select 1 from public.video_categorias c where c.equipo_id is null and c.nombre = x.nombre);
