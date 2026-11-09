-- Equipos de minibàsquet (hasta infantil): alineaciones con la normativa del CEEB (6 períodos)
alter table public.equipos add column if not exists minibasquet boolean not null default false;
