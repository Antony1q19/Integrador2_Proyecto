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
           ▼  servicio-postulantes los sube a CLOUDINARY (servicio externo)
           │  cada servicio guarda SOLO lo suyo, en su propia base de datos
           ▼
   PostgreSQL (puerto 5432) → 4 bases de datos (ver tabla de abajo)
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

## Estado de cada servicio

| Servicio | Tablas | Datos de prueba (seed) | Rutas y lógica |
|---|---|---|---|
| Gateway | ✅ | ✅ | ✅ login, usuarios, reenvío |
| servicio-postulantes | ✅ | ✅ | ✅ postulantes y documentos con Cloudinary (falta usar la tabla `usuarios`) |
| servicio-empresas-vacantes | ✅ | ✅ | 🟡 solo lectura de empresas (`GET /empresas`) y anuncios (`GET /anuncios`); falta crear/editar |
| servicio-procesos-seleccion | ✅ | ✅ | ✅ postulaciones (`/procesos`), evaluaciones (`/evaluaciones`) e indicadores del Dashboard (`/dashboard`) |

## Archivos en Cloudinary

Los archivos que suben los usuarios (CV, DNI, imágenes) se guardan en **Cloudinary**, no en nuestra base de datos; ahí solo queda la dirección (URL) y unos datos para poder borrarlos.

- **Quién sube**: `servicio-postulantes` (`app/infrastructure/cloudinary.py`). El navegador manda el archivo al backend y el backend lo reenvía a Cloudinary **firmado** con el API secret; así la clave nunca llega al navegador.
- **Configuración** (en `servicio-postulantes/.env`, que git ignora): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Si falta alguna, subir un archivo responde 503 con un mensaje que dice cuál falta.
- **Reglas**: solo PDF, JPG o PNG, máximo 5 MB.
- **Rutas**: subir `POST /postulantes/{id}/documentos/archivo`, reemplazar `PUT /postulantes/{id}/documentos/{documento_id}/archivo`, eliminar `DELETE /postulantes/{id}/documentos/{documento_id}` (también borra el archivo de Cloudinary).
- **Ver / descargar**: `GET /postulantes/{id}/documentos/{documento_id}/contenido`. El backend pide el archivo a Cloudinary con una descarga **firmada** y lo devuelve al ERP, que lo muestra en una ventana (modal). Así funciona también con los PDF y el archivo solo lo ve quien tiene sesión y rol (no se usa el enlace público).
- **PDF**: las cuentas nuevas de Cloudinary traen bloqueada la *entrega pública* de PDF (abrir su enlace directo da 401). No afecta al ERP porque usa la descarga firmada; solo importa si alguien abre el enlace de Cloudinary a mano. Se activa en Cloudinary → Settings → Security → *"PDF and ZIP files delivery"*.

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
| `infra/` | Configuración de PostgreSQL (crea las 4 bases de datos la primera vez). |

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

**Ver las tablas en TablePlus** — host `localhost`, puerto `5432`, usuario `postgres`, contraseña `postgres`, y en *Database* pon una de: `usuario_db`, `postulantes_db`, `empresas_vacantes_db`, `procesos_seleccion_db`.

**Empezar de cero** (borra TODOS los datos y vuelve a crear bases, tablas y seed): `docker compose down -v` y luego `docker compose up -d`.

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
