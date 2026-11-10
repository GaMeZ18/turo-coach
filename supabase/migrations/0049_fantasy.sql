-- Fantasy Turó: una sola liga. Todo se lee y escribe desde el servidor (service role):
-- las tablas tienen RLS activada y ninguna política, así nadie puede leerlas directamente.
create table if not exists public.fantasy_config (
  id int primary key default 1 check (id = 1),
  abierto boolean not null default false,        -- false: solo entra el administrador (pruebas)
  inicio date not null default '2026-11-09',      -- lunes de la primera jornada
  premio text,
  especiales jsonb not null default '{}'::jsonb,  -- { "2026-11-16": ["<partido_id>", ...] } partidos que puntúan ×1,5
  anuladas text[] not null default '{}',          -- jornadas anuladas (lunes)
  campeon uuid,
  cerrada boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.fantasy_config (id) values (1) on conflict do nothing;

create table if not exists public.fantasy_participantes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references public.perfiles(id) on delete set null, -- staff con cuenta
  alias text not null,                 -- nombre del equipo fantasy
  nombre text not null,                -- nombre real (lo ve el administrador)
  contacto text,                       -- email o teléfono (registro sin cuenta)
  pin_hash text,                       -- PIN (registro sin cuenta)
  sesion_hash text,                    -- sesión del navegador (registro sin cuenta)
  silenciado boolean not null default false,
  comodines jsonb not null default '{}'::jsonb, -- { "capitan3": "2026-11-16", ... }
  created_at timestamptz not null default now()
);
create unique index if not exists fantasy_alias_unico on public.fantasy_participantes (lower(alias));

create table if not exists public.fantasy_alineaciones (
  participante_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  jornada date not null,               -- lunes de la jornada
  titulares jsonb not null,            -- [{ id, precio }]
  suplente jsonb,                      -- { id, precio }
  capitan text not null,
  comodin text,                        -- capitan3 | banquillo | presupuesto
  coste int not null,
  updated_at timestamptz not null default now(),
  primary key (participante_id, jornada)
);

create table if not exists public.fantasy_mensajes (
  id uuid primary key default gen_random_uuid(),
  jornada date not null,
  participante_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  borrado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists fantasy_mensajes_jornada_idx on public.fantasy_mensajes (jornada, created_at);

alter table public.fantasy_config enable row level security;
alter table public.fantasy_participantes enable row level security;
alter table public.fantasy_alineaciones enable row level security;
alter table public.fantasy_mensajes enable row level security;
