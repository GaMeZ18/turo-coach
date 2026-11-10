-- Avatar del participante del fantasy: emoji + color, o foto pequeña (data URL)
alter table public.fantasy_participantes add column if not exists emoji text;
alter table public.fantasy_participantes add column if not exists color text;
alter table public.fantasy_participantes add column if not exists foto text;
