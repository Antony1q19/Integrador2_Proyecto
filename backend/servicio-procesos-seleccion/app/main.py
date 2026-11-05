"""Punto de arranque del microservicio de PROCESOS DE SELECCIÓN.

Este servicio es el "dueño" del recorrido de cada postulante por el proceso de
selección: en qué etapa va en cada anuncio (el tablero Kanban), el historial de
cambios de etapa y las evaluaciones. Guarda todo en su propia base de datos
(procesos_seleccion_db).

Rutas disponibles (ver api/v1/): postulaciones (/procesos) y evaluaciones
(/evaluaciones).

Regla importante: a este servicio NUNCA le habla directamente el navegador; solo
el Gateway (ver api/deps.py, que rechaza cualquier llamada que no traiga la firma
del Gateway).
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

configurar_logging("servicio-procesos-seleccion", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AL ENCENDER: con INICIALIZAR_BD (base nueva en RDS) crea las tablas que falten (leyendo las
    # clases de infrastructure/models.py).
    if settings.inicializar_bd:
        await crear_tablas(engine)
    # Abre las conexiones a la base ahora (en segundo plano) y no cuando llegue la primera petición.
    tarea_calentamiento = asyncio.create_task(calentar_conexiones(engine))
    yield  # <- aquí el servidor queda funcionando
    await tarea_calentamiento


app = FastAPI(
    title="Servicio de Procesos de Selección",
    description="Postulaciones (etapa e historial) y evaluaciones por competencias.",
    version="1.0.0",
    lifespan=lifespan,
    # La documentación interactiva (/docs) describe TODAS las rutas: no se publica.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

registrar_manejadores_excepciones(app)  # convierte errores de negocio en respuestas HTTP
app.include_router(router_v1)           # todas las rutas (/procesos, /evaluaciones)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Sirve para comprobar rápido que el servicio está vivo."""
    return {"status": "ok", "servicio": "servicio-procesos-seleccion"}
