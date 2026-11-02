# Interoperabilidad con Amazon S3 (documentos)

## Automáticas (Sprint 1) — `python tests/ejecutar.py almacenamiento-s3`

| Caso | Qué garantiza |
|---|---|
| B1 (S3) | PDF, JPG y PNG se guardan con su tipo MIME y una ruta única por postulante (dos subidas no se pisan); se descargan byte a byte idénticos; borrar algo inexistente no rompe; un bucket sin configurar o inexistente se informa como "servicio no disponible" (503), nunca como error 500, y no impide que el servicio arranque. |

La política del bucket real (privado, cifrado, solo HTTPS) se verifica en la IaC: `infra/aws/base.yaml`.
