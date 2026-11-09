-- Qué dispositivo es cada suscripción a avisos (para que coordinación vea quién los tiene activados)
alter table public.push_suscripciones add column if not exists dispositivo text;
