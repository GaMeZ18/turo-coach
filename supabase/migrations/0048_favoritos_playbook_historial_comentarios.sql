-- 1) Favoritos (cada uno los suyos) y «Me gusta» (públicos, con contador en el ejercicio)
create table if not exists public.ejercicio_favoritos (
  perfil_id uuid not null references public.perfiles(id) on delete cascade default auth.uid(),
  ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (perfil_id, ejercicio_id)
);
alter table public.ejercicio_favoritos enable row level security;
drop policy if exists "favoritos: propios" on public.ejercicio_favoritos;
create policy "favoritos: propios" on public.ejercicio_favoritos for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

create table if not exists public.ejercicio_megusta (
  perfil_id uuid not null references public.perfiles(id) on delete cascade default auth.uid(),
  ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (perfil_id, ejercicio_id)
);
alter table public.ejercicio_megusta enable row level security;
drop policy if exists "megusta: leer" on public.ejercicio_megusta;
create policy "megusta: leer" on public.ejercicio_megusta for select to authenticated using (true);
drop policy if exists "megusta: poner" on public.ejercicio_megusta;
create policy "megusta: poner" on public.ejercicio_megusta for insert to authenticated with check (perfil_id = auth.uid());
drop policy if exists "megusta: quitar" on public.ejercicio_megusta;
create policy "megusta: quitar" on public.ejercicio_megusta for delete to authenticated using (perfil_id = auth.uid());

alter table public.ejercicios add column if not exists megusta int not null default 0;
create or replace function public.contar_megusta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.ejercicios set megusta = (select count(*) from public.ejercicio_megusta m where m.ejercicio_id = coalesce(new.ejercicio_id, old.ejercicio_id))
  where id = coalesce(new.ejercicio_id, old.ejercicio_id);
  return null;
end $$;
drop trigger if exists megusta_contar on public.ejercicio_megusta;
create trigger megusta_contar after insert or delete on public.ejercicio_megusta for each row execute function public.contar_megusta();

-- 2) Enlace público para compartir un ejercicio y playbook de cada equipo
alter table public.ejercicios add column if not exists compartir_token text unique;
alter table public.equipos add column if not exists playbook_token text unique;

create table if not exists public.equipo_playbook (
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
  orden int not null default 0,
  notas text,
  created_at timestamptz not null default now(),
  primary key (equipo_id, ejercicio_id)
);
alter table public.equipo_playbook enable row level security;
drop policy if exists "playbook: staff" on public.equipo_playbook;
create policy "playbook: staff" on public.equipo_playbook for all to authenticated
  using (public.es_staff(equipo_id) or public.es_coordinador())
  with check (public.es_staff(equipo_id) or public.es_coordinador());

-- 3) Comentarios y visitas en los entrenos
create table if not exists public.entreno_comentarios (
  id uuid primary key default gen_random_uuid(),
  entrenamiento_id uuid not null references public.entrenamientos(id) on delete cascade,
  autor_id uuid not null references public.perfiles(id) on delete cascade default auth.uid(),
  texto text not null check (char_length(texto) between 1 and 2000),
  visita boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists entreno_comentarios_entreno_idx on public.entreno_comentarios(entrenamiento_id, created_at);
create index if not exists entreno_comentarios_visita_idx on public.entreno_comentarios(created_at) where visita;
alter table public.entreno_comentarios enable row level security;
drop policy if exists "comentarios entreno: leer" on public.entreno_comentarios;
create policy "comentarios entreno: leer" on public.entreno_comentarios for select to authenticated
  using (exists (select 1 from public.entrenamientos e where e.id = entrenamiento_id));
drop policy if exists "comentarios entreno: escribir" on public.entreno_comentarios;
create policy "comentarios entreno: escribir" on public.entreno_comentarios for insert to authenticated
  with check (autor_id = auth.uid() and (not visita or public.es_coordinador())
    and exists (select 1 from public.entrenamientos e where e.id = entrenamiento_id));
drop policy if exists "comentarios entreno: borrar" on public.entreno_comentarios;
create policy "comentarios entreno: borrar" on public.entreno_comentarios for delete to authenticated
  using (autor_id = auth.uid() or public.es_coordinador());

-- 4) Historial de cambios (lo ven solo los coordinadores)
create table if not exists public.historial_cambios (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid not null,     -- ejercicio o entreno
  perfil_id uuid references public.perfiles(id) on delete set null,
  accion text not null,          -- crear | editar | borrar
  detalle text,                  -- qué ha cambiado
  created_at timestamptz not null default now()
);
create index if not exists historial_registro_idx on public.historial_cambios(registro_id, created_at desc);
alter table public.historial_cambios enable row level security;
drop policy if exists "historial: coordinadores" on public.historial_cambios;
create policy "historial: coordinadores" on public.historial_cambios for select to authenticated using (public.es_coordinador());

create or replace function public.registrar_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quien uuid := auth.uid();
  v_campos text[];
  ignorar text[] := array['updated_at','created_at','preview','megusta','compartir_token','balones','canastas','conos','focos','posiciones','formato','orden'];
  nombres jsonb := '{"titulo":"título","descripcion":"descripción","correcciones":"correcciones","objetivos":"objetivos","pizarra":"pizarra","duracion":"duración","duracion_prevista":"minutos","fecha":"fecha y hora","lugar":"pista","notas":"notas","categoria":"categoría","etiquetas":"etiquetas","visibilidad":"visibilidad","en_biblioteca":"biblioteca","video_url":"vídeo","material":"material","edades":"edades","hecho":"hecho","imagenes":"imágenes","series":"series","repeticiones":"repeticiones","descanso":"descanso","jugadores_min":"jugadores","tipo":"tipo"}';
  v_reg uuid; v_accion text; v_det text; v_nombre text;
begin
  if quien is null then return null; end if; -- cambios automáticos del sistema
  if tg_table_name = 'entreno_actividades' then
    v_reg := coalesce(new.entrenamiento_id, old.entrenamiento_id);
    v_nombre := coalesce(new.titulo, old.titulo, 'actividad');
    if tg_op = 'INSERT' then v_accion := 'editar'; v_det := 'añade «' || v_nombre || '»';
    elsif tg_op = 'DELETE' then v_accion := 'editar'; v_det := 'quita «' || v_nombre || '»';
    else
      select array_agg(coalesce(nombres->>k, k)) into v_campos from jsonb_each(to_jsonb(new)) j(k, v)
        where not (k = any(ignorar)) and v is distinct from (to_jsonb(old)->k);
      if v_campos is null then return null; end if;
      v_accion := 'editar'; v_det := '«' || v_nombre || '»: ' || array_to_string(v_campos, ', ');
    end if;
  else
    v_reg := coalesce(new.id, old.id);
    if tg_op = 'INSERT' then v_accion := 'crear';
    elsif tg_op = 'DELETE' then v_accion := 'borrar'; v_det := coalesce(old.titulo, '');
    else
      select array_agg(coalesce(nombres->>k, k)) into v_campos from jsonb_each(to_jsonb(new)) j(k, v)
        where not (k = any(ignorar)) and v is distinct from (to_jsonb(old)->k);
      if v_campos is null then return null; end if;
      v_accion := 'editar'; v_det := array_to_string(v_campos, ', ');
    end if;
  end if;
  -- Varios cambios seguidos de la misma persona en 10 minutos se juntan en una línea
  if v_accion = 'editar' then
    update public.historial_cambios h set detalle = (
        select string_agg(distinct x, ' · ') from unnest(string_to_array(coalesce(h.detalle,'') || ' · ' || v_det, ' · ')) x where x <> ''),
      created_at = now()
      where h.id = (select id from public.historial_cambios where registro_id = v_reg and perfil_id = quien and accion = 'editar' and tabla in ('entrenamientos','entreno_actividades','ejercicios') and created_at > now() - interval '10 minutes' order by created_at desc limit 1);
    if found then return null; end if;
  end if;
  insert into public.historial_cambios(tabla, registro_id, perfil_id, accion, detalle) values (tg_table_name, v_reg, quien, v_accion, v_det);
  return null;
end $$;

drop trigger if exists historial_ejercicios on public.ejercicios;
create trigger historial_ejercicios after insert or update or delete on public.ejercicios for each row execute function public.registrar_cambio();
drop trigger if exists historial_entrenamientos on public.entrenamientos;
create trigger historial_entrenamientos after insert or update or delete on public.entrenamientos for each row execute function public.registrar_cambio();
drop trigger if exists historial_actividades on public.entreno_actividades;
create trigger historial_actividades after insert or update or delete on public.entreno_actividades for each row execute function public.registrar_cambio();
