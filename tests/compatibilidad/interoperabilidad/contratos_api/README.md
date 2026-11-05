# Interoperabilidad interna: contratos de API

## Automáticas (Sprint 1)

| Caso | Suite | Qué garantiza |
|---|---|---|
| C1 | `contrato-<servicio>` (×5) | El OpenAPI de cada servicio, generado desde el código, es un OpenAPI 3 válido, sin `operationId` repetidos, y no cambia sin aprobación (se compara con `contratos/<servicio>.json`). |
| C2 | `contrato-consumidores` | Cada llamada al Gateway de los dos frontends (≈ 50) existe con el mismo método y ruta en el servicio que la atiende (el Gateway o el microservicio de `proxy.py`). |

Las llamadas con ruta en una variable (`reenviarAlGateway(token, ruta)`) no se pueden verificar
estáticamente; se cubren en Sprint 2 con la colección de Postman/Bruno contra el entorno prendido.

## Sprint 2 — pruebas basadas en propiedades contra el entorno real

Con la app prendida y un token de prueba, **Schemathesis** genera cientos de peticiones a partir de
cada contrato y comprueba que las respuestas lo cumplan (códigos, formatos, sin errores 500):

```powershell
schemathesis run tests\compatibilidad\interoperabilidad\contratos_api\contratos\gateway.json `
  --url https://<ERP>/api/... -H "Authorization: Bearer <token>" --checks all
```

Hazlo sobre datos de prueba: Schemathesis también envía POST/PATCH/DELETE.
