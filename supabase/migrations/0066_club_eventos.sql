-- Corrección de 0065: ya existía public.eventos (eventos del calendario), así que los eventos con inscripción
-- van en public.club_eventos. Se quita la política añadida por error a public.eventos y se repuntan las claves.
drop policy if exists "eventos: todo" on public.eventos;

create table if not exists public.club_eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  descripcion text,
  fecha timestamptz,
  fecha_fin timestamptz,
  lugar text,
  precio_jugador int not null default 1500 check (precio_jugador >= 0),
  precio_entrenador int not null default 0 check (precio_entrenador >= 0),
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
alter table public.club_eventos enable row level security;
drop policy if exists "club_eventos: todo" on public.club_eventos;
create policy "club_eventos: todo" on public.club_eventos for all to authenticated using (public.ve_eventos()) with check (public.ve_eventos());

alter table public.evento_inscripciones drop constraint if exists evento_inscripciones_evento_id_fkey;
alter table public.evento_inscripciones add constraint evento_inscripciones_evento_id_fkey foreign key (evento_id) references public.club_eventos(id) on delete cascade;
alter table public.evento_pases drop constraint if exists evento_pases_evento_id_fkey;
alter table public.evento_pases add constraint evento_pases_evento_id_fkey foreign key (evento_id) references public.club_eventos(id) on delete cascade;
