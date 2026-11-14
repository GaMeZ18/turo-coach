-- Chat del Fantasy: responder a un mensaje (como en WhatsApp)
alter table fantasy_mensajes add column if not exists respuesta_a uuid references fantasy_mensajes(id) on delete set null;
