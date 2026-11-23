-- Marca de «datos cambiados» del Fantasy: el cálculo en memoria de cada instancia de Vercel se tira
-- en cuanto cambia (al guardar un equipo, cargar resultados de la FCBQ…). Así se puede guardar más rato sin quedar viejo.
alter table public.fantasy_config add column if not exists version timestamptz not null default now();
