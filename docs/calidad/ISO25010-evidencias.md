# Evidencias de calidad — ISO/IEC 25010 (versión 2)

Este documento reúne, para cada característica de calidad evaluada en el curso, **qué hace el sistema,
dónde está la evidencia (archivo, prueba o pantalla) y qué queda pendiente**. Las rutas de archivo son
relativas a la raíz del repositorio.

Leyenda: ✅ cumple con evidencia · 🟡 cumple parcialmente · ❌ pendiente

---

## 1. Adecuación funcional

### 1.1 Completitud funcional — ✅

| Funcionalidad | HU | Pantalla (ERP / ANUNCIOS) | API (Gateway `/api/v1/...`) | Prueba automatizada |
|---|---|---|---|---|
| Login del personal, roles y bloqueo por intentos fallidos | HU-__ | `/login` | `POST /auth/login` | `gateway/tests` (límite por IP), `libs/shared/tests` (contraseñas, firma) |
| Usuarios del ERP (crear, rol, empresas visibles, suspender, contraseña temporal) | HU-__ | `/perfil` | `/usuarios` | `gateway/tests` (contraseña temporal, roles, estados) |
| Empresas clientes | HU-__ | `/empresas` | `/empresas` | — (ver pendientes) |
| Anuncios / vacantes y portal público | HU-__ | `/anuncios`, portal ANUNCIOS | `/anuncios`, `/publico/anuncios` | — (ver pendientes) |
| Base de postulantes, documentos (CV, DNI) | HU-__ | `/postulantes`, ficha | `/postulantes`, `/postulantes/{id}/documentos` | `servicio-postulantes/tests` (documento, teléfono, archivos, consentimiento) |
| Registro y perfil del postulante en el portal | HU-__ | ANUNCIOS `/registro`, `/perfil` | `/publico/auth/*` | `servicio-postulantes/tests` (consentimiento Ley 29733) |
| Pipeline de selección (Kanban) | HU-09 | `/postulantes/pipeline` | `/procesos` | `servicio-procesos-seleccion/tests` (transiciones) |
| Evaluación por competencias | HU-08 | ficha → Evaluaciones | `/evaluaciones` | `servicio-procesos-seleccion/tests` (puntaje, APTO/NO_APTO) |
| Entrevistas | HU-__ | `/entrevistas` | `/entrevistas` | `servicio-procesos-seleccion/tests` (opciones, postulación abierta) |
| Contratación y seguimiento 30/60/90 días | HU-__ | `/contrataciones` | `/contrataciones`, `/seguimientos` | `servicio-procesos-seleccion/tests` (fechas, estado inicial, cierre) |
| Dashboard de indicadores | HU-__ | `/dashboard` | `/dashboard` | `servicio-procesos-seleccion/tests` (rango, agrupación) |
| Comunicación por WhatsApp (Meta Cloud API) | HU-__ | `/comunicaciones` | `/comunicaciones/*`, `/publico/webhook/whatsapp` | `servicio-comunicaciones/tests` (webhook, firma, plantillas, mensajes) |
| Plantillas de WhatsApp y plantillas rápidas | HU-__ | `/comunicaciones/plantillas` | `/comunicaciones/plantillas*` | `servicio-comunicaciones/tests` (variables, ejemplos) |
| Ayuda en línea | — | `/ayuda` | — | — |

> **Completar:** la columna HU con los identificadores del backlog del equipo (solo HU-08 y HU-09 están
> referenciadas en el código).

### 1.2 Corrección funcional — ✅

- **Reglas de negocio en el servidor**, no solo en la pantalla: el resultado de una evaluación, el
  paso entre etapas del pipeline o el formato de un documento los decide el backend
  (`backend/*/app/domain/`). El frontend repite algunas solo para avisar antes.
- **Validación de entrada**: más de 200 reglas declarativas (Pydantic `Field`) y 120+ errores de
  negocio con mensaje en español (`SolicitudInvalida` 400, `RecursoNoEncontrado` 404,
  `ConflictoDeEstado` 409, `ServicioNoDisponible` 503).
- **Verificado por pruebas automatizadas** (sección 2).

### 1.3 Pertinencia funcional — ✅

- Tres roles con permisos diferenciados (`frontend/ERP/lib/permisos.ts` + `requerir_rol` en cada
  servicio). El backend aplica las mismas reglas que la pantalla: ocultar un botón no basta.
- **Visibilidad por empresa**: RRHH y Supervisor solo ven sus empresas asignadas y lo que depende de
  ellas — incluidos los chats de WhatsApp (corregido en v2: `servicio-comunicaciones/app/api/visibilidad.py`).
- **Supervisor solo lectura** también en WhatsApp (corregido en v2).
- El flujo sigue el proceso real: postulación → evaluación → entrevista → preselección → contratación →
  seguimiento post-ingreso.

---

## 2. Verificación y validación — ✅ (verificación) · 🟡 (validación con usuarios)

### 2.1 Verificación automatizada

| Suite | Archivo | Pruebas | Qué verifica |
|---|---|---|---|
| Librería común | `backend/libs/shared/tests/test_shared_kernel.py` | 32 | Configuración (URL de RDS), teléfonos (+51), firma HMAC entre servicios (alteración, repetición, caducidad), visibilidad por empresa, política y hash de contraseñas, códigos HTTP de errores |
| Gateway | `backend/gateway/tests/test_gateway.py` | 11 | Contraseña temporal aleatoria y segura, roles y estados, límite de peticiones por IP (429) |
| Postulantes | `backend/servicio-postulantes/tests/test_reglas_postulantes.py` | 26 | DNI/CE/pasaporte, teléfono, archivos (tipo real por contenido, 5 MB), consentimiento Ley 29733, listas del perfil |
| Procesos de selección | `backend/servicio-procesos-seleccion/tests/test_reglas_seleccion.py` | 26 | Transiciones del pipeline, evaluación APTO/NO_APTO, entrevistas, contratación, seguimientos, dashboard |
| Comunicaciones | `backend/servicio-comunicaciones/tests/test_comunicaciones.py` | 20 | Webhook de Meta (verificación, firma válida/ inválida, rechazo sin clave), plantillas, motivos de fallo, datos personales ocultos en logs |
| **Total** | | **115** | **115 pasan** |

**Integración continua** (`.github/workflows/`):
- `ci-backend.yml`: corre las 5 suites en cada push / PR que toque `backend/` y guarda el reporte JUnit
  como artefacto (evidencia descargable desde GitHub Actions).
- `ci.yml`: lint + build de producción del ERP y de ANUNCIOS (0 errores, 0 advertencias en v2).

**Cómo correrlas localmente** (desde la raíz, con Docker encendido):
```bash
docker compose run --rm --no-deps -v "$PWD/backend/servicio-comunicaciones/tests:/app/tests" servicio-comunicaciones sh -c "pip install -q pytest && python -m pytest /app/tests -q"
```
(cambiar el servicio y la carpeta para las demás suites; la librería común se corre con la imagen del gateway).

### 2.2 Validación con usuarios (UAT) — pendiente de ejecutar

Plantilla para registrar la validación de cada funcionalidad con el usuario (consultora):

| Funcionalidad | Criterio de aceptación | Usuario / rol | Fecha | Resultado (OK / Observado) | Observaciones |
|---|---|---|---|---|---|
| Pipeline de selección | Mover una postulación entre etapas deja historial | RRHH | | | |
| WhatsApp | Un mensaje del postulante aparece en el ERP en menos de 10 s | RRHH | | | |
| … | | | | | |

---

## 3. Compatibilidad

### 3.1 Interoperabilidad — ✅

| Mecanismo | Evidencia |
|---|---|
| API REST + JSON documentada con **OpenAPI** | `/docs` de cada servicio FastAPI (solo en desarrollo) |
| **Meta WhatsApp Cloud API** (envío, plantillas, estados, vistos, webhook) | `servicio-comunicaciones/app/infrastructure/whatsapp_client.py`, `app/api/v1/webhook.py` |
| **Amazon SES** (correos de invitación y recuperación) | `servicio-postulantes/app/infrastructure/correo.py` |
| **Amazon RDS** PostgreSQL (esquema por servicio) y **Amazon S3** (bucket privado y cifrado) | `infra/aws/app.yaml`, `infra/aws/base.yaml` |
| Infraestructura como código (**CloudFormation**) con encendido/apagado y finalización | `infra/aws/` |
| Comunicación entre servicios firmada (HMAC con caducidad y anti-repetición) | `libs/shared/shared_kernel/security.py`, pruebas en `libs/shared/tests` |
| Exportación de indicadores a **CSV** | `frontend/ERP/features/dashboard/utils/exportarCsv.ts` |
| Formato de teléfono internacional (E.164 sin `+`, Perú por defecto) | `libs/shared/shared_kernel/telefonos.py` |

### 3.2 Co-existencia — ✅

- 7 contenedores independientes (`docker-compose.yml`); los microservicios **no se publican** fuera de
  la red de Docker (solo el Gateway :8000 y los frontends :3000/:3001).
- Cada servicio es dueño de **su esquema** de base de datos; se relacionan solo por id.
- Dos frontends (ERP y portal) conviven con sesiones y tokens separados (audiencia `anuncios`).
- En AWS, el balanceador solo acepta tráfico de CloudFront y del backend solo es público el webhook de
  WhatsApp (`infra/aws/app.yaml`): el resto del sistema no queda expuesto en internet.
- Limitación conocida: los límites por IP y cachés del Gateway viven en memoria (válido para una sola
  instancia; con varias réplicas se requiere Redis).

---

## 4. Capacidad de interacción (usabilidad)

### 4.1 Facilidad de aprendizaje — ✅

- Interfaz y mensajes **en español**, menú filtrado por rol, términos del dominio (postulante, etapa,
  vacante).
- **Página de Ayuda** (`/ayuda`, `frontend/ERP/features/ayuda/`): guía por módulo con pasos, qué puede
  hacer cada rol (resaltando el del usuario), preguntas frecuentes y buscador.
- Chat con convenciones conocidas de WhatsApp (burbujas, ✓ / ✓✓ / ✓✓ azul).

### 4.2 Protección contra errores del usuario — ✅

| Error que se previene | Cómo |
|---|---|
| Borrar algo por accidente | Modal de confirmación (7 pantallas) |
| Datos inválidos | Validación en el formulario y de nuevo en el servidor |
| Subir un archivo peligroso o enorme | Solo PDF/JPG/PNG verificados por contenido, máx. 5 MB |
| Mandar un WhatsApp que no llegará (ventana de 24 h cerrada) | El chat lo detecta, bloquea el envío y ofrece "Retomar chat" (v2) |
| Enviar marketing a quien no lo aceptó | Bloqueado en el servidor según el consentimiento (v2) |
| Acciones fuera del rol | Botones ocultos/deshabilitados + 403 en el servidor |
| Mover una postulación a una etapa inválida | Reglas del pipeline (409 con explicación) |

### 4.3 Asistencia al usuario — ✅

- Mensajes de error **que explican qué hacer** (ej. "Para revertir una decisión final indica el motivo").
- Motivo visible cuando un WhatsApp no se entrega (ej. "Pasaron más de 24 horas… usa Retomar chat") (v2).
- Indicador de hasta cuándo se puede escribir libremente a cada postulante (v2).
- Ayudas contextuales (75 `title`/`placeholder`/ayudas de campo), avisos de éxito/error (toasts),
  estados vacíos, página 404, atributos de accesibilidad (`aria-*`).

### 4.4 Compromiso del usuario (user engagement) — 🟡

- Avisos de mensajes nuevos en **cualquier pantalla** del ERP, con clic que abre el chat, y contador de
  no leídos en el menú (v2).
- Dashboard con indicadores, pantallas de carga (skeletons), vista previa de plantillas.
- **Pendiente:** medirlo (encuesta SUS y métricas de uso), ver sección 6.

---

## 5. Seguridad (cambios de la versión 2)

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| El webhook aceptaba llamadas que no venían de Meta | Firma `X-Hub-Signature-256` verificada; fuera de desarrollo, sin clave se rechaza todo | `webhook.py`, 3 pruebas |
| El túnel exponía todo el Gateway (`/docs`, login…) | En AWS: solo el webhook es público (regla del balanceador) y `/docs` se oculta en producción | `infra/aws/app.yaml` |
| Chats visibles para cualquier RRHH/Supervisor | Regla de empresas aplicada | `servicio-comunicaciones/app/api/visibilidad.py` |
| Supervisor podía enviar mensajes | Solo lectura (backend y pantalla) | `conversaciones.py`, `lib/permisos.ts` |
| Logs con texto y teléfono completo de los mensajes | Teléfono enmascarado, sin texto | `domain/mensajes.py: ocultar_telefono`, prueba |
| Webhook sin límite de peticiones | 600/min por IP | `gateway/app/api/v1/publico_webhook.py` |
| Ruta de demo que permitía falsear el estado de un mensaje | Eliminada (`simular-estado`) | `conversaciones.py` |
| Lint de ANUNCIOS con 6 errores (CI en rojo) | Corregidos (tipos explícitos, efecto sin setState) | `npx eslint .` → 0 problemas |

---

## 6. Pendientes conocidos (siguiente versión)

1. Pruebas de API con base de datos (contenedor PostgreSQL en el CI) y pruebas E2E (Playwright) de los
   flujos principales.
2. Ejecutar y registrar la **UAT** (sección 2.2) y una **prueba de usabilidad** con 3–5 usuarios:
   tareas cronometradas + cuestionario SUS.
3. Completar la columna HU de la matriz de trazabilidad.
4. Configurar `META_APP_SECRET` (clave secreta de la app de Meta) en el entorno.
5. Recibir/enviar archivos por WhatsApp; mensajes automáticos por evento (entrevista programada,
   recordatorio, ingreso).
6. Imágenes Docker de producción, migraciones con Alembic y Redis para el Gateway (requisito para AWS).
