"""Punto de arranque del microservicio de EMPRESAS Y VACANTES.

Este servicio es el "dueño" de las empresas cliente y de sus anuncios de trabajo.
Guarda todo en su propia base de datos (empresas_vacantes_db).

ESTADO ACTUAL: las tablas existen (infrastructure/models.py) y hay datos de
prueba (infrastructure/seed.py). Por ahora la única lógica es LEER anuncios
(api/v1/anuncios.py), que hace falta para mostrar en qué anuncios postuló un
postulante. Crear/editar empresas y anuncios llegará después.

Regla importante: a este servicio NUNCA le habla directamente el navegador; solo
el Gateway (ver api/deps.py, que rechaza cualquier llamada que no traiga la firma
del Gateway).

Para ver las rutas, con el backend encendido abre:
    http://localhost:8002/docs   (solo para depurar; en el uso normal se pasa por el Gateway)
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from app.infrastructure.seed import sembrar_datos_de_prueba
from shared_kernel.database import calentar_conexiones, crear_tablas
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-empresas-vacantes", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AL ENCENDER: en modo "desarrollo" crea las tablas que falten (leyendo las
    # clases de infrastructure/models.py) y siembra los datos de prueba.
    if settings.entorno == "desarrollo":
        await crear_tablas(engine)
        await sembrar_datos_de_prueba()
    # Abre las conexiones a la base ahora (en segundo plano) y no cuando llegue la primera petición.
    tarea_calentamiento = asyncio.create_task(calentar_conexiones(engine))
    yield  # <- aquí el servidor queda funcionando
    await tarea_calentamiento


app = FastAPI(
    title="Servicio de Empresas y Vacantes",
    description="Empresas cliente y sus anuncios (vacantes). Por ahora solo lectura de anuncios.",
    version="0.2.0",
    lifespan=lifespan,
)

registrar_manejadores_excepciones(app)  # convierte errores de negocio en respuestas HTTP
app.include_router(router_v1)           # todas las rutas (/anuncios)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Sirve para comprobar rápido que el servicio está vivo."""
    return {"status": "ok", "servicio": "servicio-empresas-vacantes"}
