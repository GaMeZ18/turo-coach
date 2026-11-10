-- El físico fuera de pista solo se marca con actividades «Prep. física» en la sesión (se quitan los minutos a mano).
update entrenamientos set fisico_fuera = 0, fisico_fuera_fin = 0 where fisico_fuera <> 0 or fisico_fuera_fin <> 0;
-- ocupacion_pistas: pista = desde la primera actividad que no es prep. física hasta la última (ver Supabase).
