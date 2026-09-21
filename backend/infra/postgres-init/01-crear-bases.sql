-- Se ejecuta una sola vez, al crear el volumen de Postgres por primera
-- vez (mecanismo estándar de la imagen oficial: todo *.sql en
-- /docker-entrypoint-initdb.d/). Una base de datos por microservicio
-- (ADR-002: "base propia por servicio").
--
-- Ojo: si el volumen ya existe, este archivo NO se vuelve a ejecutar. Para
-- volver a correrlo desde cero: `docker compose down -v` (borra los datos).

-- Gateway: los trabajadores del ERP (Admin, RRHH, Supervisor) y sus contraseñas.
CREATE USER gateway_user WITH PASSWORD 'gateway_pass';
CREATE DATABASE usuario_db OWNER gateway_user;

-- servicio-postulantes: postulantes, documentos y cuentas de acceso de los postulantes.
CREATE USER postulantes_user WITH PASSWORD 'postulantes_pass';
CREATE DATABASE postulantes_db OWNER postulantes_user;

-- servicio-empresas-vacantes: empresas cliente y sus anuncios.
CREATE USER empresas_user WITH PASSWORD 'empresas_pass';
CREATE DATABASE empresas_vacantes_db OWNER empresas_user;

-- servicio-procesos-seleccion: postulaciones, historial de estados y evaluaciones.
CREATE USER procesos_user WITH PASSWORD 'procesos_pass';
CREATE DATABASE procesos_seleccion_db OWNER procesos_user;
