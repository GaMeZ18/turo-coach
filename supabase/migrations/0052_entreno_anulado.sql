-- Entrenos anulados (lluvia, vaga, pista ocupada…): dejan de contar en avisos, estadísticas y ocupación de pistas
alter table public.entrenamientos add column if not exists anulado_motivo text;
alter table public.entrenamientos add column if not exists anulado_en timestamptz;
-- ocupacion_pistas: igual que en 0044 pero sin los entrenos anulados (ver la definición aplicada en Supabase)
