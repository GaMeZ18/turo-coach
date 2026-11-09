-- Avisos en el móvil para la gente que hace mesa (sin cuenta): se activan desde el enlace para apuntarse
create table if not exists public.mesa_push (
  endpoint text primary key,
  persona_id uuid not null references public.mesa_personas(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.mesa_push enable row level security;
-- Sin políticas: solo el servidor (clave de servicio)
