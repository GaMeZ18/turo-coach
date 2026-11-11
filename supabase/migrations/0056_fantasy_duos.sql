-- Dúo técnico en el fantasy: nombres por equipo (los pone el administrador) y el dúo fichado en cada alineación
alter table public.fantasy_config add column if not exists duos jsonb not null default '{}'::jsonb;  -- { "<equipo_id>": "Nombre y Nombre" }
alter table public.fantasy_alineaciones add column if not exists duo jsonb;                           -- { id: "duo:<equipo_id>", precio }
