-- Para separar los tiros propios de los del rival: canasta a la que ataca el equipo en la 1ª parte y momento del descanso
alter table videos add column if not exists canasta_1a text check (canasta_1a in ('izquierda','derecha'));
alter table videos add column if not exists descanso real;
