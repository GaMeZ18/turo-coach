-- Comunicados que se ven una vez (se quitan de Avisos al leerlos) y Noticias del club (se quedan en su pantalla)
alter table public.notificaciones add column if not exists efimera boolean not null default false;
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.perfiles(id) on delete set null,
  titulo text not null,
  resumen text not null default '',
  contenido text not null default '',
  publicada_en timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.noticias enable row level security;
drop policy if exists "noticias: leer" on public.noticias;
create policy "noticias: leer" on public.noticias for select to authenticated using (publicada_en <= now() or public.es_coordinador());
drop policy if exists "noticias: coordinadores" on public.noticias;
create policy "noticias: coordinadores" on public.noticias for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());
alter table public.comunicados add column if not exists tipo text not null default 'comunicado' check (tipo in ('comunicado','noticia'));
alter table public.comunicados add column if not exists noticia_id uuid references public.noticias(id) on delete cascade;
