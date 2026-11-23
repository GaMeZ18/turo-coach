-- Eventos del club con inscripción de equipos, pago (transferencia con justificante; TPV/Bizum más adelante)
-- y un pase QR por persona. Gestión: solo la cuenta de Juan Gámez (ve_eventos()).
-- La parte pública (inscribirse, subir justificante, ver el pase) va por el servidor con adminClient.
create or replace function public.ve_eventos() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = '60fb55be-45e2-4f5d-addc-35aaf44b7610'::uuid;
$$;

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  descripcion text,
  fecha timestamptz,
  fecha_fin timestamptz,
  lugar text,
  precio_jugador int not null default 1500 check (precio_jugador >= 0),      -- céntimos
  precio_entrenador int not null default 0 check (precio_entrenador >= 0),   -- céntimos
  min_jugadores int not null default 5,
  max_jugadores int not null default 15,
  max_equipos int,
  fecha_limite timestamptz,
  abierto boolean not null default false,
  pago_transferencia boolean not null default true,
  pago_tpv boolean not null default false,
  iban text,
  titular text,
  torneo_id uuid references public.torneos(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evento_inscripciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  codigo text not null unique default md5(gen_random_uuid()::text),
  referencia text not null,                       -- para el concepto de la transferencia (TURO-AB12)
  equipo text not null,
  club text,
  categoria text,
  responsable text not null,
  email text not null,
  telefono text,
  personas jsonb not null default '[]',          -- [{ nombre, rol: 'jugador'|'entrenador', dorsal?, email? }]
  importe int not null,                           -- céntimos
  metodo text check (metodo in ('transferencia', 'tpv')),
  estado text not null default 'pendiente_pago' check (estado in ('pendiente_pago', 'pendiente_validacion', 'aprobada', 'rechazada', 'cancelada')),
  comprobante text,                               -- ruta en el bucket privado
  motivo text,                                    -- motivo de rechazo
  notas text,
  pago_ref text,                                  -- referencia del TPV
  pagado_at timestamptz,
  aprobada_at timestamptz,
  torneo_equipo_id uuid references public.torneo_equipos(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists evento_inscripciones_evento_idx on public.evento_inscripciones(evento_id);

create table if not exists public.evento_pases (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  inscripcion_id uuid not null references public.evento_inscripciones(id) on delete cascade,
  codigo text not null unique,                    -- secreto aleatorio (va en el QR)
  nombre text not null,
  rol text not null default 'jugador',
  dorsal text,
  anulado boolean not null default false,
  usado_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists evento_pases_inscripcion_idx on public.evento_pases(inscripcion_id);

alter table public.eventos enable row level security;
alter table public.evento_inscripciones enable row level security;
alter table public.evento_pases enable row level security;
drop policy if exists "eventos: todo" on public.eventos;
create policy "eventos: todo" on public.eventos for all to authenticated using (public.ve_eventos()) with check (public.ve_eventos());
drop policy if exists "evento_inscripciones: todo" on public.evento_inscripciones;
create policy "evento_inscripciones: todo" on public.evento_inscripciones for all to authenticated using (public.ve_eventos()) with check (public.ve_eventos());
drop policy if exists "evento_pases: todo" on public.evento_pases;
create policy "evento_pases: todo" on public.evento_pases for all to authenticated using (public.ve_eventos()) with check (public.ve_eventos());

-- Justificantes de transferencia: privado (solo con URL firmada desde el servidor)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eventos-justificantes', 'eventos-justificantes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;
