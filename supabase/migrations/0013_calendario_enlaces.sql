-- ============================================================
-- Coach Manager CBTuró · Enlaces para suscribirse al calendario (iPhone, Android, Google, Outlook)
-- ============================================================
create table if not exists public.calendario_enlaces (
  token text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  perfil_id uuid not null default auth.uid() references public.perfiles(id) on delete cascade,
  alcance text not null check (alcance in ('mios', 'equipo', 'club')),
  equipo_id uuid references public.equipos(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.calendario_enlaces enable row level security;
drop policy if exists "calendario: mios" on public.calendario_enlaces;
create policy "calendario: mios" on public.calendario_enlaces for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
