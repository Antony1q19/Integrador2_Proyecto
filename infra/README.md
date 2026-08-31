# Infraestructura local

Levanta PostgreSQL de forma reproducible con Docker Compose, sin instalarlo
distinto en cada computador.

```bash
cp infra/.env.example infra/.env
# Edita infra/.env y cambia POSTGRES_PASSWORD

docker compose --env-file infra/.env -f infra/compose.yaml config
docker compose --env-file infra/.env -f infra/compose.yaml up -d
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs postgres
docker compose --env-file infra/.env -f infra/compose.yaml down
```

`docker compose down` conserva el volumen `postgres_data`. Usa `down -v` solo
cuando el equipo decida descartar ese entorno y no exista información necesaria.

Esta base de datos aún no está conectada a un Back-End (ver `docs/decisiones/ADR-001-stack-tecnologico.md`);
por ahora solo valida que el servicio puede declararse, iniciarse e inspeccionarse.
