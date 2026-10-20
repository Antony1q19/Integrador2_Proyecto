# Backend — guía para entenderlo

Este backend está hecho con **Python + FastAPI** y guarda los datos en **PostgreSQL**. Todo corre en **AWS** (ECS Fargate + RDS + S3 + SES), desplegado con CloudFormation: ver [infra/aws/README.md](../infra/aws/README.md).

## ¿Cómo está organizado? (la idea en una imagen)

```
   Navegador (ERP :3000 / ANUNCIOS :3001)
          │  el navegador habla con Next.js; Next.js (en el servidor) llama al Gateway
          ▼
   ┌───────────────┐   Es la "recepción del edificio": revisa quién eres
   │   GATEWAY     │   (login/token) y te manda a la oficina correcta.
   │   puerto 8000 │
   └───────┬───────┘
           │  (cada llamada lleva una firma secreta: "vengo del Gateway")
           ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │ SERVICIO-POSTULANTES         :8001   postulantes, documentos      │
   │ SERVICIO-EMPRESAS-VACANTES   :8002   empresas y anuncios          │
   │ SERVICIO-PROCESOS-SELECCION  :8003   pipeline, evaluaciones...    │
   │ SERVICIO-COMUNICACIONES      :8004   WhatsApp (Meta Cloud API)    │
   └───────────────────────────────────────────────────────────────────┘
           │  los archivos (CV, DNI) NO van a la base de datos: van a Amazon S3
           ▼  cada servicio guarda SOLO lo suyo, en su propio esquema
   Amazon RDS PostgreSQL: una base, un esquema por servicio
```

**¿Por qué así?** Cada servicio es dueño de su parte y de su propio esquema. Un servicio no se
"enlaza" con las tablas de otro: se refieren entre sí solo por el **id** (ej. una postulación guarda
el `postulante_id` y el `anuncio_id`).

## La base de datos y sus tablas

Una sola base PostgreSQL (`talenterp`) con un **esquema** (carpeta) por servicio:

| Esquema (`DB_SCHEMA`) | Servicio dueño | Tablas |
|---|---|---|
| `usuario` | Gateway | `usuarios` — trabajadores del ERP (Admin, RRHH, Supervisor) y sus contraseñas |
| `postulantes` | servicio-postulantes | `postulantes`, `documentos`, `usuarios` (cuentas del portal ANUNCIOS), `tokens_recuperacion`, `invitaciones_cuenta` |
| `empresas_vacantes` | servicio-empresas-vacantes | `empresas`, `anuncios` |
| `procesos_seleccion` | servicio-procesos-seleccion | `procesos_postulacion`, `historial_estados`, `evaluaciones`, `entrevistas`, `contrataciones`, `seguimientos_postingreso` |
| `comunicaciones` | servicio-comunicaciones | `conversaciones`, `mensajes`, `plantillas_rapidas` |

> Las dos tablas `usuarios` son **independientes**: una es del personal del ERP y otra de los postulantes.

**Dónde corre:** Amazon RDS PostgreSQL 17 en subredes privadas. Con `INICIALIZAR_BD=true` cada
servicio crea al arrancar las tablas que falten. La URL se arma con `DB_HOST` y `DB_PASSWORD`
(secreto de SSM). Ver [infra/aws/README.md](../infra/aws/README.md).

Las columnas nuevas en tablas que ya existen se agregan solas al arrancar (`aplicar_migraciones` de
cada servicio, con `ADD COLUMN IF NOT EXISTS`).

## Estado de cada servicio

| Servicio | Rutas y lógica |
|---|---|
| Gateway | login, usuarios, reenvío, webhook público de WhatsApp |
| servicio-postulantes | postulantes, documentos (S3), cuentas del portal, correos (SES) |
| servicio-empresas-vacantes | empresas y anuncios |
| servicio-procesos-seleccion | postulaciones (`/procesos`), evaluaciones, entrevistas, contrataciones, seguimientos post-ingreso e indicadores del Dashboard |
| servicio-comunicaciones | chats de WhatsApp (Meta Cloud API), plantillas, webhook |

## Archivos (CV, DNI, certificados)

Los archivos que suben los usuarios **no** se guardan en la base: ahí solo queda su ruta
(`documentos.ruta_archivo`), su tipo y su tamaño. Los archivos van a un bucket **privado y cifrado**
de Amazon S3. Solo `servicio-postulantes` puede leerlo, con el rol de IAM de su tarea (no hay claves
en el código ni en la configuración).

- **Reglas**: solo PDF, JPG o PNG (se verifica el contenido real, no solo la extensión), máximo 5 MB.
- **Rutas**: subir `POST /postulantes/{id}/documentos/archivo`, reemplazar `PUT .../{documento_id}/archivo`,
  eliminar `DELETE .../{documento_id}` (también borra el archivo), ver `GET .../{documento_id}/contenido`
  (el backend lo lee y lo entrega solo a quien tiene sesión y rol).

## Correos

`servicio-postulantes` envía la invitación a crear cuenta y la recuperación de contraseña.
Usa **Amazon SES** (el remitente debe estar verificado en SES).

## Rapidez con la base de datos

Cada "viaje" a la base se paga completo, así que el código hace **menos viajes por petición**
(`libs/shared/shared_kernel/database.py`):
- Las rutas que solo **leen** (GET) usan `obtener_sesion_lectura`: modo autocommit, sin abrir ni cerrar transacción (ahorra 2 viajes). Las que **guardan** usan `obtener_sesion` (con transacción).
- No se comprueba la conexión en cada uso, solo si estuvo inactiva más de 20 s; se abren 3 conexiones al encender el servicio.
- Pocas conexiones por servicio (3 + 2 extra): los 5 servicios comparten una instancia pequeña de RDS.
- Consultas combinadas (ej. postulante + "¿tiene cuenta?" en una sola; conversaciones + último mensaje) e índices donde se busca seguido (ej. teléfono de las conversaciones).
- El Gateway recuerda 15 s el estado de cada cuenta (`gateway/app/core/cache_cuentas.py`); cuando un Admin la cambia, se olvida al instante.

## Qué empresas ve cada persona

- **Admin**: ve todas las empresas y todo lo que depende de ellas.
- **RRHH y Supervisor**: solo ven las empresas que un Admin les asignó en `/perfil` (campo `empresas_visibles`), y lo que depende de ellas: **sus anuncios, las postulaciones a esos anuncios y los postulantes** que postularon a ellos (más las evaluaciones y documentos de esos postulantes). Lo demás responde **404**, como si no existiera. Un postulante que aún no ha postulado a nada no pertenece a ninguna empresa, así que lo ven todos.
- **Cómo funciona**: el Gateway lee la lista de empresas del usuario en su base de datos **en cada petición** (un cambio del Admin vale al instante y una cuenta suspendida o eliminada deja de ver empresas) y la manda a los servicios en la cabecera `X-Usuario-Empresas`. Cada servicio la aplica en sus consultas. Cuando un servicio necesita saber algo que vive en otro (ej. procesos-seleccion pregunta a empresas-vacantes qué anuncios puede ver el usuario) usa `shared_kernel/visibilidad.py`, que firma la llamada como el Gateway y, si el otro servicio no responde, devuelve 503 (nunca "adivina").
- **Dónde está el código**: `libs/shared/shared_kernel/visibilidad.py` (regla y llamadas entre servicios), `gateway/app/api/v1/proxy.py` (manda la cabecera), `servicio-empresas-vacantes/app/api/v1/{empresas,anuncios}.py`, `servicio-procesos-seleccion/app/api/visibilidad.py` y `servicio-postulantes/app/api/visibilidad.py`.
- **Importante al cambiar `shared_kernel`**: su código se copia dentro de la imagen de cada servicio, así que hay que volver a publicar todos: `.\infra\aws\publicar.ps1`.

## Dashboard (indicadores)

`GET /dashboard?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&empresaId=N` (en `servicio-procesos-seleccion`, cálculo en `app/domain/dashboard.py`) devuelve de una vez todos los indicadores: resumen (postulaciones, en proceso, contratados, descartados, tasas, días para contratar, vacantes cubiertas, evaluaciones), embudo por etapa, serie en el tiempo (por día, semana o mes según el largo del rango), rendimiento por empresa y por anuncio, competencias y actividad reciente.

- **Fechas en hora de Perú (UTC-5).** "Postulaciones del periodo" = las recibidas dentro del rango; el embudo y las tasas se calculan sobre ellas. Las contrataciones de la serie cuentan por el día en que se marcó "Contratado".
- **Filtro por empresa**: respeta lo que cada usuario puede ver (ver "Qué empresas ve cada persona"). Pedir una empresa que no tienes asignada responde 404.
- Sin fechas: últimos 30 días. Máximo 5 años de rango.

## Entrevistas, contrataciones y seguimiento post-ingreso

Viven en `servicio-procesos-seleccion` (tablas `entrevistas`, `contrataciones` y `seguimientos_postingreso`, esquema `procesos_seleccion`). Cada una cuelga de una postulación (`procesos.id`); la persona y la vacante se guardan solo por id (viven en otros servicios).

- **Entrevistas** (`/entrevistas`): se programa con fecha, hora y modalidad (Presencial / Virtual / Telefónica; lugar o enlace). Estados: Programada → Realizada / Cancelada / No asistió. Al programar la primera, la postulación pasa a **Entrevista**. Al cerrarla se guarda el resultado (Aprobada / No aprobada / Pendiente de decisión) y las observaciones.
- **Contrataciones** (`/contrataciones`): una por postulación (`proceso_id` único). Se registra desde "Dónde ha postulado" o al soltar la tarjeta en **Contratado** del pipeline: fecha de ingreso, tipo de contrato, salario y moneda. Estados: Por ingresar → Activo → Finalizado / Cancelado. Si la postulación deja de estar en Contratado, la contratación pasa a Cancelado.
- **Seguimientos post-ingreso** (`/seguimientos`): al contratar se crean controles a los **30, 60 y 90 días** (se pueden agregar más). Cada uno se registra con valoración (Satisfactorio / Con observaciones / Insatisfactorio) y observaciones, o se omite. Finalizar o cancelar la contratación omite los pendientes. Un control es "vencido" si su fecha ya pasó y sigue pendiente.
- **Visibilidad**: igual que el resto, cada persona solo ve lo de sus empresas (404 si no). El Supervisor solo lee.
- **Dashboard**: `GET /dashboard` suma entrevistas de hoy y próximas, entrevistas realizadas en el rango, ingresos por iniciar, controles pendientes/vencidos y una `agenda` con las próximas entrevistas y controles.
- **En el ERP**: páginas `/entrevistas` y `/contrataciones`, pestañas "Entrevistas" y "Contratación" en la ficha del postulante, y el Dashboard.

## Mapa de carpetas

| Carpeta | Para qué sirve |
|---|---|
| `gateway/` | La puerta de entrada: login, trabajadores del ERP y reenvío de peticiones. |
| `servicio-postulantes/` | Todo lo de postulantes: datos personales, documentos, consentimiento, cuentas. |
| `servicio-empresas-vacantes/` | Empresas cliente y sus anuncios. |
| `servicio-procesos-seleccion/` | Postulaciones, historial de estados y evaluaciones. |
| `libs/shared/shared_kernel/` | Código que usan **todos** (configuración, base de datos, tokens, contraseñas, errores). No es un servicio. |

## Dentro de cada servicio (`<servicio>/app/`)

Cada archivo tiene **una sola responsabilidad**. Si buscas algo, ve directo a su carpeta:

| Carpeta | Qué encuentras | Ejemplo |
|---|---|---|
| `main.py` | El arranque del servicio. Empieza leyendo este. | |
| `api/v1/` | Las **rutas** (URLs) que se pueden llamar: `GET`, `POST`... | `auth.py`, `postulantes.py` |
| `api/deps.py` | Comprobaciones de seguridad reutilizables (¿tiene sesión? ¿tiene el rol?). | |
| `schemas/` | El **formato de los JSON** que entran y salen. | `PostulanteCrear` |
| `infrastructure/models.py` | Las **tablas** de la base de datos (columnas). | `Usuario`, `Postulante` |
| `domain/` | Las **reglas de negocio** (decisiones propias del sistema). | "el consentimiento es obligatorio" |
| `core/` | Configuración y conexiones (base de datos, variables de entorno). | |

## El recorrido de una petición (ejemplo: listar postulantes)

1. El ERP llama a `GET /api/v1/postulantes` con su token.
2. **Gateway** → `api/v1/proxy.py`: comprueba el token, agrega la firma y reenvía.
3. **servicio-postulantes** → `api/deps.py`: comprueba la firma; luego `api/v1/postulantes.py` consulta la tabla definida en `infrastructure/models.py`.
4. La respuesta vuelve por el mismo camino hasta el navegador.

## Seguridad en 4 ideas

1. **Contraseñas**: nunca se guardan; solo su *hash* (bcrypt). → `libs/shared/shared_kernel/passwords.py`
2. **Token de sesión (JWT)**: lo entrega el Gateway al iniciar sesión y viene firmado; si alguien lo modifica, se rechaza. → `libs/shared/shared_kernel/security.py`
3. **Firma del Gateway**: los microservicios rechazan cualquier llamada que no venga del Gateway. → `servicio-postulantes/app/api/deps.py`
4. **Roles**: `Admin`, `RRHH`, `Supervisor`, `Postulante`. Cada ruta indica quién puede usarla con `requerir_rol(...)`.

Los secretos (claves) viven **solo** en **SSM Parameter Store**, cifrados; los administra `infra/aws/configurar.ps1` (las claves internas se generan solas). No hay archivos `.env`: cada servicio lee su configuración de las variables de entorno que le pone ECS (`infra/aws/app.yaml`).

## Vocabulario rápido

- **Endpoint / ruta**: una dirección a la que se puede llamar (ej. `GET /postulantes`).
- **JSON**: el formato de texto en que se envían los datos entre programas.
- **Modelo**: una clase de Python que representa una tabla de la base de datos.
- **Schema**: describe qué campos debe tener un JSON.
- **Hash**: resultado de "triturar" una contraseña de forma irreversible.
- **JWT / token**: comprobante de sesión firmado que se envía en cada petición.
- **CORS**: permiso para que una página web (el ERP) llame a otro servidor (el Gateway).
- **Commit**: confirmar y guardar de verdad los cambios en la base de datos.
- **Borrado lógico**: en vez de borrar la fila, se marca como "Eliminado" y se oculta.

## Sobre `__pycache__`

Python crea carpetas `__pycache__` con archivos de caché. Están desactivadas en las imágenes (`PYTHONDONTWRITEBYTECODE=1` en los `Dockerfile`), y además git las ignora. Si aparecen al correr las pruebas, puedes borrarlas sin problema.
