-- Chat del Fantasy: reacciones, adjuntos del administrador y moderación (avisos y silencio temporal)
alter table fantasy_mensajes add column if not exists adjunto jsonb;
alter table fantasy_participantes add column if not exists silenciado_hasta timestamptz;

create table if not exists fantasy_reacciones (
  mensaje_id uuid not null references fantasy_mensajes(id) on delete cascade,
  participante_id uuid not null references fantasy_participantes(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (mensaje_id, participante_id)
);
alter table fantasy_reacciones enable row level security;

create table if not exists fantasy_moderacion (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references fantasy_participantes(id) on delete cascade,
  tipo text not null check (tipo in ('aviso','silencio')),
  motivo text,
  hasta timestamptz,
  mensaje_id uuid references fantasy_mensajes(id) on delete set null,
  visto boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists fantasy_moderacion_p on fantasy_moderacion(participante_id, visto);
alter table fantasy_moderacion enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fantasy-chat', 'fantasy-chat', true, 52428800, array['image/*','video/*','audio/*','application/pdf'])
on conflict (id) do nothing;
