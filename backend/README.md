# Backend — guía para entenderlo

Este backend está hecho con **Python + FastAPI** y guarda los datos en **PostgreSQL**. Todo corre en contenedores de **Docker**.

## ¿Cómo está organizado? (la idea en una imagen)

```
   Navegador (ERP :3000 / ANUNCIOS :3001)
          │
          ▼
   ┌───────────────┐   Es la "recepción del edificio": revisa quién eres
   │   GATEWAY     │   (login/token) y te manda a la oficina correcta.
   │   puerto 8000 │
   └───────┬───────┘
           │  (cada llamada lleva una firma secreta: "vengo del Gateway")
           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ SERVICIO-POSTULANTES         :8001   (con rutas, ya funciona) │
   │ SERVICIO-EMPRESAS-VACANTES   :8002   (lee anuncios)           │
   │ SERVICIO-PROCESOS-SELECCION  :8003   (postulaciones y eval.)  │
   └──────────────────────────────────────────────────────────────┘
           │  los archivos (CV, imágenes) NO van a la base de datos:
           ▼  servicio-postulantes los sube a SUPABASE STORAGE (bucket privado)
           │  cada servicio guarda SOLO lo suyo, en su propia base de datos
           ▼
   PostgreSQL (Supabase: 2 proyectos, 4 esquemas; ver tabla de abajo)
```

**¿Por qué así?** Cada servicio es dueño de su parte y de su propia base de datos. Como las bases están separadas, un servicio no puede "enlazarse" con las tablas de otro: se refieren entre sí solo por el **id** (ej. una postulación guarda el `postulante_id` y el `anuncio_id`).

## Las bases de datos y sus tablas

| Base de datos | Servicio dueño | Tablas |
|---|---|---|
| `usuario_db` | Gateway | `usuarios` — trabajadores del ERP (Admin, RRHH, Supervisor) y sus contraseñas |
| `postulantes_db` | servicio-postulantes | `postulantes`, `documentos`, `usuarios` (cuentas de acceso de los postulantes a la app ANUNCIOS) |
| `empresas_vacantes_db` | servicio-empresas-vacantes | `empresas`, `anuncios` |
| `procesos_seleccion_db` | servicio-procesos-seleccion | `procesos_postulacion`, `historial_estados`, `evaluaciones` |

> Las dos tablas `usuarios` son **independientes**: una es del personal del ERP y otra de los postulantes. Están en bases distintas a propósito, para que no se mezclen.

## Base de datos en Supabase (2 proyectos)

Supabase es PostgreSQL alojado en la nube. Como el plan gratuito permite 2 proyectos y cada proyecto trae UNA base, las bases de antes pasan a ser **esquemas** (carpetas dentro de la base):

| Proyecto de Supabase | Esquema (`DB_SCHEMA`) | Servicio |
|---|---|---|
| `talenterp-personas` | `usuario` | Gateway |
| `talenterp-personas` | `postulantes` | servicio-postulantes |
| `talenterp-reclutamiento` | `empresas_vacantes` | servicio-empresas-vacantes |
| `talenterp-reclutamiento` | `procesos_seleccion` | servicio-procesos-seleccion |

**Cómo se crean las tablas y los datos:** no hace falta ningún script SQL. Al arrancar cada servicio con `ENTORNO=desarrollo`, crea su esquema (`CREATE SCHEMA IF NOT EXISTS`), las tablas que falten (a partir de `infrastructure/models.py`) y los datos de prueba (`infrastructure/seed.py`). Solo crea lo que falta: si cambias una columna de una tabla que ya existe, hay que hacerlo a mano en Supabase (`ALTER TABLE`, desde el SQL Editor).

**Pasos:**
1. En cada proyecto de Supabase: botón **Connect** → **Session pooler** → copia la cadena de conexión.
2. En el `.env` de cada servicio pon `DATABASE_URL=postgresql+asyncpg://postgres.<id>:<contraseña>@<host-del-pooler>:5432/postgres?ssl=require` y `DB_SCHEMA=<esquema de la tabla de arriba>`. (Si la contraseña tiene `@`, `#`, `/`... escríbelos codificados: `@` = `%40`.)
3. `docker compose up -d --build` (hay que reconstruir porque `shared_kernel` se copia dentro de la imagen).
4. En Supabase → Table Editor → elige el esquema en el desplegable y verás las tablas.

**Seguridad:** Supabase publica una API REST de los esquemas "expuestos" (por defecto solo `public`). Tus tablas están en esquemas propios, así que NO agregues `usuario`, `postulantes`... en Settings → API → *Exposed schemas* (la tabla `usuario.usuarios` tiene hashes de contraseñas). El backend se conecta directo a la base, no por esa API.

**Si algo falla:** "password authentication failed" → el usuario debe ser `postgres.<id-del-proyecto>` (con el punto); "Tenant or user not found" → el host del pooler es de otra región; el "Direct connection" suele ser solo IPv6 y Docker en Windows puede no llegar: usa el Session pooler; si usas el puerto 6543 (Transaction pooler) el código ya desactiva las sentencias preparadas.

## Estado de cada servicio

| Servicio | Tablas | Datos de prueba (seed) | Rutas y lógica |
|---|---|---|---|
| Gateway | ✅ | ✅ | ✅ login, usuarios, reenvío |
| servicio-postulantes | ✅ | ✅ | ✅ postulantes y documentos con Supabase Storage (falta usar la tabla `usuarios`) |
| servicio-empresas-vacantes | ✅ | ✅ | 🟡 solo lectura de empresas (`GET /empresas`) y anuncios (`GET /anuncios`); falta crear/editar |
| servicio-procesos-seleccion | ✅ | ✅ | ✅ postulaciones (`/procesos`), evaluaciones (`/evaluaciones`), entrevistas (`/entrevistas`), contrataciones (`/contrataciones`), seguimientos post-ingreso (`/seguimientos`) e indicadores del Dashboard (`/dashboard`) |

## Archivos en Supabase Storage

Los archivos que suben los usuarios (CV, DNI, imágenes) se guardan en **Supabase Storage** (proyecto `talenterp-personas`), no en nuestra base de datos; ahí solo queda la ruta del archivo (`documentos.ruta_archivo`), su tipo y su tamaño.

- **Quién sube**: `servicio-postulantes` (`app/infrastructure/storage.py`). El navegador manda el archivo al backend y el backend lo guarda en un **bucket privado**: los archivos no tienen enlace público, solo el backend (con su clave secreta) los lee.
- **Configuración** (en `servicio-postulantes/.env`, que git ignora): `SUPABASE_URL` (la "Project URL" de `talenterp-personas`), `SUPABASE_SERVICE_KEY` (la clave **secreta** `service_role`/`secret` de Project Settings → API; da control total del proyecto, no la compartas) y `SUPABASE_BUCKET` (por defecto `postulantes-documentos`). El bucket se crea solo al encender el servicio (privado, máximo 5 MB, solo PDF/JPG/PNG). Si falta la URL o la clave, subir un archivo responde 503 con un mensaje que dice cuál falta.
- **Reglas**: solo PDF, JPG o PNG, máximo 5 MB.
- **Rutas**: subir `POST /postulantes/{id}/documentos/archivo`, reemplazar `PUT /postulantes/{id}/documentos/{documento_id}/archivo`, eliminar `DELETE /postulantes/{id}/documentos/{documento_id}` (también borra el archivo del Storage).
- **Ver / descargar**: `GET /postulantes/{id}/documentos/{documento_id}/contenido`. El backend lee el archivo del bucket y lo devuelve al ERP, que lo muestra en una ventana (modal). Solo lo ve quien tiene sesión y rol.

## Rapidez con la base de datos en la nube

Supabase está lejos (unos 200 ms de ida y vuelta) y cada "viaje" a la base se paga completo, así que el código está pensado para hacer **menos viajes por petición** (`libs/shared/shared_kernel/database.py`):
- Las rutas que solo **leen** (GET) usan `obtener_sesion_lectura`: modo autocommit, sin abrir ni cerrar transacción (ahorra 2 viajes). Las que **guardan** usan `obtener_sesion` (con transacción).
- No se comprueba la conexión en cada uso, solo si estuvo inactiva más de 20 s; se reutiliza siempre la conexión más reciente (ya tiene las consultas "aprendidas") y se abren 3 conexiones al encender el servicio (abrir una nueva tarda 1-4 s).
- Pocas conexiones por servicio (3 + 2 extra): el "Session pooler" da a cada una una conexión real de la base y el plan gratuito tiene pocas.
- Consultas combinadas (ej. postulante + "¿tiene cuenta?" en una sola; postulaciones + historial con `joinedload`) y sin `refresh` innecesarios tras guardar.
- El Gateway recuerda 15 s las empresas de cada RRHH/Supervisor (`gateway/app/core/cache_empresas.py`); cuando un Admin las cambia, se olvida al instante.
- Resultado medido: una lectura simple pasó de ~1000 ms a ~215 ms (1 viaje) y el Dashboard de ~2400 ms a ~850 ms.

## Qué empresas ve cada persona

- **Admin**: ve todas las empresas y todo lo que depende de ellas.
- **RRHH y Supervisor**: solo ven las empresas que un Admin les asignó en `/perfil` (campo `empresas_visibles`), y lo que depende de ellas: **sus anuncios, las postulaciones a esos anuncios y los postulantes** que postularon a ellos (más las evaluaciones y documentos de esos postulantes). Lo demás responde **404**, como si no existiera. Un postulante que aún no ha postulado a nada no pertenece a ninguna empresa, así que lo ven todos.
- **Cómo funciona**: el Gateway lee la lista de empresas del usuario en su base de datos **en cada petición** (un cambio del Admin vale al instante y una cuenta suspendida o eliminada deja de ver empresas) y la manda a los servicios en la cabecera `X-Usuario-Empresas`. Cada servicio la aplica en sus consultas. Cuando un servicio necesita saber algo que vive en otro (ej. procesos-seleccion pregunta a empresas-vacantes qué anuncios puede ver el usuario) usa `shared_kernel/visibilidad.py`, que firma la llamada como el Gateway y, si el otro servicio no responde, devuelve 503 (nunca "adivina").
- **Dónde está el código**: `libs/shared/shared_kernel/visibilidad.py` (regla y llamadas entre servicios), `gateway/app/api/v1/proxy.py` (manda la cabecera), `servicio-empresas-vacantes/app/api/v1/{empresas,anuncios}.py`, `servicio-procesos-seleccion/app/api/visibilidad.py` y `servicio-postulantes/app/api/visibilidad.py`.
- **Importante al cambiar `shared_kernel`**: su código se copia dentro de cada imagen de Docker, así que hay que reconstruir: `docker compose build` y `docker compose up -d`.

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

## Datos de prueba (el "seed")

Al encender un servicio en modo desarrollo (`ENTORNO=desarrollo`), se crean **las tablas que falten** y se inserta **un registro de ejemplo en cada tabla** (solo si no existe, así que reiniciar no duplica nada). Cada servicio lo tiene en `app/infrastructure/seed.py`.

Como las bases están separadas, los registros de prueba se enlazan por **ids fijos** definidos en un solo lugar: `libs/shared/shared_kernel/datos_prueba.py` (el postulante de prueba, la empresa 1, el anuncio 1). Por eso la postulación de prueba apunta al postulante de prueba y al anuncio de prueba.

**Cuentas de prueba** (contraseña de todas: `123456`):

| Correo | Dónde | Rol |
|---|---|---|
| `admin@test.com` | ERP | Admin |
| `rrhh@test.com` | ERP | RRHH |
| `super@test.com` | ERP | Supervisor |
| `postulante.prueba@example.com` | ANUNCIOS (tabla `usuarios` de postulantes) | Postulante |

## Mapa de carpetas

| Carpeta | Para qué sirve |
|---|---|
| `gateway/` | La puerta de entrada: login, trabajadores del ERP y reenvío de peticiones. |
| `servicio-postulantes/` | Todo lo de postulantes: datos personales, documentos, consentimiento, cuentas. |
| `servicio-empresas-vacantes/` | Empresas cliente y sus anuncios. |
| `servicio-procesos-seleccion/` | Postulaciones, historial de estados y evaluaciones. |
| `libs/shared/shared_kernel/` | Código que usan **todos** (leer `.env`, base de datos, tokens, contraseñas, errores, ids de prueba). No es un servicio. |

## Dentro de cada servicio (`<servicio>/app/`)

Cada archivo tiene **una sola responsabilidad**. Si buscas algo, ve directo a su carpeta:

| Carpeta | Qué encuentras | Ejemplo |
|---|---|---|
| `main.py` | El arranque del servicio. Empieza leyendo este. | |
| `api/v1/` | Las **rutas** (URLs) que se pueden llamar: `GET`, `POST`... | `auth.py`, `postulantes.py` |
| `api/deps.py` | Comprobaciones de seguridad reutilizables (¿tiene sesión? ¿tiene el rol?). | |
| `schemas/` | El **formato de los JSON** que entran y salen. | `PostulanteCrear` |
| `infrastructure/models.py` | Las **tablas** de la base de datos (columnas). | `Usuario`, `Postulante` |
| `infrastructure/seed.py` | Los **datos de prueba** que se insertan al arrancar. | |
| `domain/` | Las **reglas de negocio** (decisiones propias del sistema). | "el consentimiento es obligatorio" |
| `core/` | Configuración y conexiones (base de datos, `.env`). | |

En `servicio-empresas-vacantes` y `servicio-procesos-seleccion`, las carpetas `api/`, `domain/` y `schemas/` están vacías a propósito: son la lógica que se escribirá después.

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

Los secretos (claves) viven en los archivos `.env`, **que no se suben a git**. Los `.env.example` son plantillas: **nunca pongas claves reales en un `.env.example`**. Los 4 servicios deben tener el **mismo** `JWT_SECRET` y `GATEWAY_SHARED_SECRET`.

## Comandos útiles

```bash
# Encender todo (desde la carpeta raíz del proyecto)
docker compose up -d

# Ver los mensajes (logs) de un servicio
docker logs gateway-service --tail 50

# Documentación automática de las rutas (para probarlas en el navegador)
#   http://localhost:8000/docs   Gateway
#   http://localhost:8001/docs   Postulantes (solo para depurar)
```

**Empezar de cero** (borra TODOS los datos de prueba): en Supabase, en el SQL Editor de cada proyecto, ejecuta `drop schema usuario cascade;` (y lo mismo con `postulantes`, `empresas_vacantes` y `procesos_seleccion`, cada uno en su proyecto) y luego `docker compose up -d --force-recreate`: los servicios vuelven a crear esquemas, tablas y datos.

## Vocabulario rápido

- **Endpoint / ruta**: una dirección a la que se puede llamar (ej. `GET /postulantes`).
- **JSON**: el formato de texto en que se envían los datos entre programas.
- **Modelo**: una clase de Python que representa una tabla de la base de datos.
- **Seed**: datos de ejemplo que se insertan solos al arrancar, para no tener tablas vacías.
- **Schema**: describe qué campos debe tener un JSON.
- **Hash**: resultado de "triturar" una contraseña de forma irreversible.
- **JWT / token**: comprobante de sesión firmado que se envía en cada petición.
- **CORS**: permiso para que una página web (el ERP) llame a otro servidor (el Gateway).
- **Commit**: confirmar y guardar de verdad los cambios en la base de datos.
- **Borrado lógico**: en vez de borrar la fila, se marca como "Eliminado" y se oculta.

## Sobre `__pycache__`

Python crea carpetas `__pycache__` con archivos de caché. Aquí están desactivadas dentro de Docker (`PYTHONDONTWRITEBYTECODE=1` en los `Dockerfile`), y además git las ignora. Si ejecutas Python **fuera** de Docker y aparecen, puedes borrarlas sin problema.
