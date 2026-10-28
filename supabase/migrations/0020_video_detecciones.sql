-- ============================================================
-- Coach Manager CBTuró · Vídeo: clips detectados automáticamente, pendientes de revisar
-- ============================================================
alter table public.video_clips add column if not exists estado text check (estado in ('pendiente'));
alter table public.video_clips add column if not exists confianza numeric;
alter table public.video_clips add column if not exists origen text;
