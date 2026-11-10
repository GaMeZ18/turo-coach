-- Inventario de material del club. De momento solo lo ve y edita la cuenta de Juan Gámez (es_gamez()).
create or replace function public.ve_material() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = '60fb55be-45e2-4f5d-addc-35aaf44b7610'::uuid;
$$;

create table if not exists public.material_lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.material (
  id uuid primary key default gen_random_uuid(),
  lugar_id uuid not null references public.material_lugares(id) on delete cascade,
  nombre text not null,
  categoria text,
  cantidad int not null default 0 check (cantidad >= 0),
  rotos int not null default 0 check (rotos >= 0),
  minimo int,
  notas text,
  contado_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.perfiles(id) on delete set null
);
create index if not exists material_lugar_idx on public.material(lugar_id);

alter table public.material_lugares enable row level security;
alter table public.material enable row level security;
drop policy if exists "material_lugares: todo" on public.material_lugares;
create policy "material_lugares: todo" on public.material_lugares for all to authenticated
  using (public.ve_material()) with check (public.ve_material());
drop policy if exists "material: todo" on public.material;
create policy "material: todo" on public.material for all to authenticated
  using (public.ve_material()) with check (public.ve_material());
