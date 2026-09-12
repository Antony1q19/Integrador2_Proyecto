-- Se ejecuta una sola vez, al crear el volumen de Postgres por primera
-- vez (mecanismo estándar de la imagen oficial: todo *.sql en
-- /docker-entrypoint-initdb.d/). Una base de datos por microservicio
-- (ADR-002: "base propia por servicio").

CREATE USER gateway_user WITH PASSWORD 'gateway_pass';
CREATE DATABASE gateway_db OWNER gateway_user;

CREATE USER postulantes_user WITH PASSWORD 'postulantes_pass';
CREATE DATABASE postulantes_db OWNER postulantes_user;
