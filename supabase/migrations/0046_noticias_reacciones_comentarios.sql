-- Reacciones con emoji y comentarios (texto corto o GIF) en las noticias
create table if not exists public.noticia_reacciones (
  noticia_id uuid not null references public.noticias(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (noticia_id, perfil_id, emoji)
);
create table if not exists public.noticia_comentarios (
  id uuid primary key default gen_random_uuid(),
  noticia_id uuid not null references public.noticias(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 500),
  gif text check (gif is null or char_length(gif) <= 1500000),
  created_at timestamptz not null default now()
);
create index if not exists noticia_comentarios_noticia on public.noticia_comentarios (noticia_id, created_at);
alter table public.noticia_reacciones enable row level security;
alter table public.noticia_comentarios enable row level security;
drop policy if exists "reacciones: leer" on public.noticia_reacciones;
create policy "reacciones: leer" on public.noticia_reacciones for select to authenticated using (true);
drop policy if exists "reacciones: mias" on public.noticia_reacciones;
create policy "reacciones: mias" on public.noticia_reacciones for insert to authenticated with check (perfil_id = auth.uid());
drop policy if exists "reacciones: quitar" on public.noticia_reacciones;
create policy "reacciones: quitar" on public.noticia_reacciones for delete to authenticated using (perfil_id = auth.uid());
drop policy if exists "comentarios: leer" on public.noticia_comentarios;
create policy "comentarios: leer" on public.noticia_comentarios for select to authenticated using (true);
drop policy if exists "comentarios: escribir" on public.noticia_comentarios;
create policy "comentarios: escribir" on public.noticia_comentarios for insert to authenticated with check (perfil_id = auth.uid());
drop policy if exists "comentarios: borrar" on public.noticia_comentarios;
create policy "comentarios: borrar" on public.noticia_comentarios for delete to authenticated using (perfil_id = auth.uid() or public.es_coordinador());
