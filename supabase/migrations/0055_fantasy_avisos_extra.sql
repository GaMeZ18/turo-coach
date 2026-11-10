-- Avisos del fantasy: insignias ya avisadas (para avisar solo de las nuevas) y cuándo miró cada uno el chat (resumen diario)
create table if not exists public.fantasy_insignias_avisadas (
  participante_id uuid not null references public.fantasy_participantes(id) on delete cascade,
  codigo text not null,
  created_at timestamptz not null default now(),
  primary key (participante_id, codigo)
);
alter table public.fantasy_insignias_avisadas enable row level security;
alter table public.fantasy_participantes add column if not exists chat_visto timestamptz;
