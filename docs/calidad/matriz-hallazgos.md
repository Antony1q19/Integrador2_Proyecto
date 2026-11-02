# Matriz de hallazgos — Compatibilidad (ISO/IEC 25010)

**Proyecto:** TalentERP · **Actualizada:** 2026-11-01 (Sprints 1, 2 y 3 de pruebas de compatibilidad)
**Origen:** análisis del sistema completo + `tests/`: 155 pruebas automáticas, 21 comprobaciones contra AWS real y 79 pruebas en navegadores.
Plan y resultados: [plan-pruebas-compatibilidad.md](plan-pruebas-compatibilidad.md).

**Severidad:** 🔴 Alta (afecta a usuarios o a la operación hoy) · 🟠 Media (riesgo probable o sin
evidencia) · 🟢 Baja (mejora o riesgo a futuro).
**Estado:** ✅ Resuelto · 🔧 Implementado, falta desplegar · ⏳ Pendiente · 📌 Aceptado (limitación documentada).

## Resumen

| Estado | Cantidad |
|---|---|
| ✅ Resuelto | 9 |
| ⏳ Pendiente | 3 |
| 📌 Aceptado | 1 |
| **Total** | **13** |

## Hallazgos

| ID | Hallazgo | Subcaracterística | Sev. | Evidencia | Acción | Estado | Sprint |
|---|---|---|---|---|---|---|---|
| H1 | El cliente de Meta (`whatsapp_client.py`) no tenía ninguna prueba: un cambio en el formato de Meta o en sus códigos de error solo se detectaba en producción. | Interoperabilidad | 🟠 | Análisis: 0 pruebas sobre el cliente; solo el webhook entrante. | 33 pruebas con `respx` (formato de cada petición, 10 tipos de error, desconexión, configuración, versión) y formatos reales del webhook. | ✅ | 1 |
| H2 | Sin pruebas del envío de correos (SES) ni del almacenamiento de documentos (S3). | Interoperabilidad | 🟠 | Análisis: 0 pruebas sobre `correo.py` y `storage.py`. | 20 pruebas con `moto` (API real de boto3 simulada). | ✅ | 1 |
| H3 | Sin contratos de API: un cambio de ruta en un servicio rompía el ERP o el portal sin aviso. | Interoperabilidad | 🟠 | Análisis: OpenAPI desactivado y sin pruebas de contrato. | Contrato OpenAPI aprobado por servicio (15 pruebas) + verificación de las 51 llamadas de los frontends contra esos contratos. | ✅ | 1 |
| H9 | **Defecto.** Cuando Meta bloquea la app (`API access blocked`), restringe la cuenta, aplica un límite o falla, el ERP respondía **400 "solicitud inválida"** (como si fuera culpa del usuario) en vez de 503. Es lo que se vio en el incidente de WhatsApp de octubre. | Interoperabilidad | 🔴 | `test_cada_error_de_meta_se_traduce_al_codigo_correcto` falla con el código anterior (7 casos). | `whatsapp_client.py`: códigos 10/200/368/131031 (acceso), 4/80007/130429/131056 (límite) y 5xx → 503 con motivo claro. | ✅ | 1 |
| H10 | **Defecto.** Si Meta (o un intermediario) respondía un error que **no es JSON** (ej. página HTML de un 502), el servicio se caía con **error 500**. | Interoperabilidad | 🔴 | Caso `502-html` de la misma prueba. | Lectura protegida del cuerpo de error → 503 "WhatsApp no está respondiendo". | ✅ | 1 |
| H11 | **Defecto.** El **OpenAPI del Gateway era inválido**: la ruta comodín del proxy repetía el mismo `operationId` en 5 métodos. Rompe Postman, Schemathesis y generadores de clientes. | Interoperabilidad | 🟠 | `test_el_contrato_es_un_openapi_3_valido` y `test_no_hay_operation_id_repetidos` (contrato-gateway). | `proxy.py`: la ruta se registra una vez por método con su propio `operationId`. | ✅ | 1 |
| H8 | Un fallo de las integraciones (token vencido, app bloqueada, SES rechazando) **no generaba ninguna alerta**: el bloqueo de Meta se notó solo porque alguien lo vio. | Interoperabilidad | 🟠 | Incidente "API access blocked" (oct. 2026). | `base.yaml`: filtros de métricas sobre los logs + 2 alarmas de CloudWatch (WhatsApp y correo) que avisan por correo (SNS). Patrones verificados con `aws logs test-metric-filter`. Desplegadas el 2026-11-01 (estado OK). | ✅ Falta solo confirmar la suscripción en el correo de AWS. | 1 |
| H5 | La co-existencia estaba **argumentada pero no medida**. | Co-existencia | 🟠 | Documento ISO 25010, sección 3.2, sin pruebas. | Diseño verificado (25 pruebas sobre la IaC + 11 de sesiones) y **medido en AWS**: aislamiento de fallos E3 5/5 (apagar WhatsApp no afecta al resto) y sesiones ERP/portal en el navegador. Queda opcional la carga con k6. | ✅ | 1, 2, 3 |
| H4 | Sin pruebas en navegadores ni dispositivos (el CI del frontend solo hace lint y build). | Interoperabilidad | 🟠 | `.github/workflows/ci.yml`. | Playwright: 79/79 en Chrome, Firefox, Safari (WebKit), Android e iPhone emulados, sin errores 5xx ni de JavaScript. Quedan Edge, flujos que modifican datos y dispositivos reales. | ✅ (lectura) | 3 |
| H7 | El remitente de los correos es una dirección **@gmail.com** verificada en SES: el dominio que firma (amazonses.com) no coincide con el remitente → riesgo de spam o rechazo (alineación DMARC/DKIM). | Interoperabilidad | 🟠 | Configuración `CORREO_REMITENTE` en `infra/aws/config.env`. | Usar un dominio propio verificado en SES con Easy DKIM y SPF; medir antes/después con mail-tester (caso B4). | ⏳ | 2 |
| H6 | La versión de la Graph API está fija en `v23.0`; Meta retira cada versión ~2 años después de publicarla. | Interoperabilidad | 🟢 | `META_API_VERSION` en `servicio-comunicaciones/app/core/config.py`. | Ya verificado que migrar es solo cambiar la variable (prueba A5). Falta: revisar el calendario de Meta y repetir A2/A4 con la versión nueva antes de la fecha de retiro. | ⏳ | 2 |
| H12 | Los límites de peticiones por IP y las cachés del Gateway viven en la memoria de cada contenedor: válido con 1 réplica; con 2 o más, cada una cuenta por su cuenta. | Co-existencia | 🟢 | `gateway/app/core/limite_peticiones.py`, `cache_cuentas.py`. | Mientras el Gateway tenga 1 tarea no aplica. Para escalar: Redis (ElastiCache). | 📌 | — |
| H13 | Las pruebas de contrato no pueden verificar las llamadas cuya ruta está en una variable (`reenviarAlGateway(token, ruta)`), ni el comportamiento real de cada endpoint con datos. | Interoperabilidad | 🟢 | `contrato-consumidores` las omite. | Schemathesis no puede ejecutarse desde fuera: el Gateway (correctamente) no está expuesto a internet. Ejecutarlo como tarea ECS dentro de la VPC, o cubrir con Playwright las pantallas que usan esas rutas (hecho para las de lectura). | ⏳ | — |

## Observaciones fuera de Compatibilidad (para el resto del informe ISO 25010)

Detectadas durante el análisis; no se cuentan en la matriz de arriba.

| Característica | Observación | Recomendación |
|---|---|---|
| Fiabilidad | RDS en una sola zona y sin backups automáticos (solo el snapshot que guarda `apagar.ps1`). | Aceptable para el curso; en producción real: Multi-AZ y retención de backups. |
| Mantenibilidad | Las imágenes se publican siempre como `:latest`: no hay forma rápida de volver a la versión anterior. | Etiquetar las imágenes con el commit de git. |
| Seguridad | La clave de acceso del usuario IAM usado para desplegar debe rotarse periódicamente. | Rotarla en IAM y cargarla con `aws configure --profile desarrollo`. |
