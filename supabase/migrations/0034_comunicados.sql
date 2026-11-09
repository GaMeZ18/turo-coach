-- Comunicados de coordinación: mensaje a las personas elegidas (en Avisos y en el móvil), ahora o programado
create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.perfiles(id) on delete set null,
  titulo text not null,
  cuerpo text not null default '',
  url text,
  destinatarios uuid[] not null default '{}',
  programado_para timestamptz,
  enviado_en timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists comunicados_pendientes on public.comunicados (programado_para) where enviado_en is null;
alter table public.comunicados enable row level security;
drop policy if exists "comunicados: coordinadores" on public.comunicados;
create policy "comunicados: coordinadores" on public.comunicados for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());
