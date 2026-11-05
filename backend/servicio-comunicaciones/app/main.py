"""Punto de arranque del microservicio de COMUNICACIONES.

Maneja los chats con los postulantes (WhatsApp).
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from app.infrastructure.migraciones import aplicar_migraciones
from shared_kernel.database import calentar_conexiones, crear_tablas
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-comunicaciones", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Con INICIALIZAR_BD (base nueva en RDS): crea las tablas que falten.
    if settings.inicializar_bd:
        await crear_tablas(engine)
    # Siempre: índices nuevos y plantillas rápidas iniciales (si faltan).
    await aplicar_migraciones(engine)
    tarea_calentamiento = asyncio.create_task(calentar_conexiones(engine))
    yield
    await tarea_calentamiento


app = FastAPI(
    title="Servicio de Comunicaciones",
    description="Chats de WhatsApp con los postulantes.",
    version="1.0.0",
    lifespan=lifespan,
    # La documentación interactiva (/docs) describe TODAS las rutas: no se publica.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

registrar_manejadores_excepciones(app)
app.include_router(router_v1)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "servicio": "servicio-comunicaciones"}