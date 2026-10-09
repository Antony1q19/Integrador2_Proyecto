"""Punto de arranque del microservicio de COMUNICACIONES.

Maneja los chats con los postulantes (WhatsApp).
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from shared_kernel.database import calentar_conexiones, crear_tablas
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-comunicaciones", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.entorno == "desarrollo":
        await crear_tablas(engine)
    tarea_calentamiento = asyncio.create_task(calentar_conexiones(engine))
    yield
    await tarea_calentamiento


app = FastAPI(
    title="Servicio de Comunicaciones",
    description="Chats de WhatsApp con los postulantes.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.entorno == "desarrollo" else None,
    redoc_url="/redoc" if settings.entorno == "desarrollo" else None,
    openapi_url="/openapi.json" if settings.entorno == "desarrollo" else None,
)

registrar_manejadores_excepciones(app)
app.include_router(router_v1)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "servicio": "servicio-comunicaciones"}