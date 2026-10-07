"""Punto de arranque del microservicio de POSTULANTES.

Este servicio es el "dueño" de todo lo que tiene que ver con un postulante:
sus datos personales, sus documentos (CV, DNI...), su consentimiento de datos y
su cuenta de acceso a la app ANUNCIOS. Guarda todo en su propia base de datos
(postulantes_db).

Regla importante: a este servicio NUNCA le habla directamente el navegador.
Solo le habla el Gateway (ver api/deps.py, que rechaza cualquier llamada que no
traiga la firma del Gateway).

Para ver las rutas, con el backend encendido abre:
    http://localhost:8001/docs   (solo para depurar; en el uso normal se pasa por el Gateway)
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from sqlalchemy import text
from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from app.infrastructure.models import InvitacionCuenta
from app.infrastructure.seed import sembrar_datos_de_prueba
from app.domain.postulantes import TAMANO_MAXIMO_BYTES, TIPOS_DE_ARCHIVO_PERMITIDOS
from app.infrastructure.storage import asegurar_bucket, cerrar_cliente
from shared_kernel.database import calentar_conexiones, crear_tablas
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-postulantes", settings.log_level)


async def _asegurar_columnas_nuevas() -> None:
    """Añade columnas a tablas existentes si la base de datos ya existía en Supabase."""
    esquema = settings.db_schema
    prefijo = f'"{esquema}".' if esquema else ""
    consultas = [
        f"ALTER TABLE {prefijo}usuarios ADD COLUMN IF NOT EXISTS password_cambiada_en TIMESTAMP WITH TIME ZONE;",
        f"ALTER TABLE {prefijo}postulantes ADD COLUMN IF NOT EXISTS version_terminos_aceptados VARCHAR(20);",
        f"ALTER TABLE {prefijo}postulantes ADD COLUMN IF NOT EXISTS ip_aceptacion VARCHAR(45);",
        f"ALTER TABLE {prefijo}postulantes ADD COLUMN IF NOT EXISTS resumen_profesional VARCHAR(1000);",
    ]
    async with engine.begin() as conn:
        for sql in consultas:
            try:
                await conn.execute(text(sql))
            except Exception:  # noqa: BLE001
                pass


async def _asegurar_tablas_nuevas() -> None:
    """Crea (solo si faltan) las tablas agregadas después, en CUALQUIER entorno: hoy la de
    invitaciones de un solo uso (ver InvitacionCuenta). Si falla, avisa en el log y sigue."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda c: InvitacionCuenta.metadata.create_all(c, tables=[InvitacionCuenta.__table__])
            )
    except Exception as error:  # noqa: BLE001
        logging.getLogger(__name__).warning("No se pudo asegurar la tabla de invitaciones: %s", error)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AL ENCENDER: en modo "desarrollo" crea las tablas que falten (leyendo las
    # clases de infrastructure/models.py) y siembra los datos de prueba
    # (infrastructure/seed.py).
    if settings.entorno == "desarrollo":
        await crear_tablas(engine)
        await _asegurar_columnas_nuevas()
        await sembrar_datos_de_prueba()
    # En cualquier entorno: las tablas agregadas después (ej. invitaciones de un solo uso).
    await _asegurar_tablas_nuevas()
    # Abre las conexiones a la base ahora (en segundo plano) y no cuando llegue la primera petición.
    tarea_calentamiento = asyncio.create_task(calentar_conexiones(engine))
    # Crea el bucket privado de Supabase Storage si todavía no existe.
    tarea_bucket = asyncio.create_task(asegurar_bucket(TAMANO_MAXIMO_BYTES, TIPOS_DE_ARCHIVO_PERMITIDOS))
    yield  # <- aquí el servidor queda funcionando
    await asyncio.gather(tarea_calentamiento, tarea_bucket)
    await cerrar_cliente()


app = FastAPI(
    title="Servicio de Postulantes",
    description="Datos personales, documentos, consentimientos y cuentas de los postulantes.",
    version="1.0.0",
    lifespan=lifespan,
    # La documentación interactiva (/docs) describe TODAS las rutas: solo se publica en desarrollo.
    docs_url="/docs" if settings.entorno == "desarrollo" else None,
    redoc_url="/redoc" if settings.entorno == "desarrollo" else None,
    openapi_url="/openapi.json" if settings.entorno == "desarrollo" else None,
)

registrar_manejadores_excepciones(app)  # convierte errores de negocio en respuestas HTTP
app.include_router(router_v1)           # todas las rutas (/postulantes, /postulantes/{id}/documentos)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Sirve para comprobar rápido que el servicio está vivo."""
    return {"status": "ok", "servicio": "servicio-postulantes"}
