-- Revisa los avisos automáticos cada 15 minutos (llama a la app; cada aviso solo se manda una vez)
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.unschedule('avisos-coach') where exists (select 1 from cron.job where jobname = 'avisos-coach');
select cron.schedule('avisos-coach', '*/15 * * * *', $$select net.http_get('https://coach.cbturo.com/api/avisos', timeout_milliseconds := 30000)$$);
