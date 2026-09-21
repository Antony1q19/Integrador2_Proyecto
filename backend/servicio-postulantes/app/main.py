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
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from app.infrastructure.seed import sembrar_datos_de_prueba
from shared_kernel.database import Base
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-postulantes", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # AL ENCENDER: en modo "desarrollo" crea las tablas que falten (leyendo las
    # clases de infrastructure/models.py) y siembra los datos de prueba
    # (infrastructure/seed.py).
    if settings.entorno == "desarrollo":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await sembrar_datos_de_prueba()
    yield  # <- aquí el servidor queda funcionando


app = FastAPI(
    title="Servicio de Postulantes",
    description="Datos personales, documentos, consentimientos y cuentas de los postulantes.",
    version="1.0.0",
    lifespan=lifespan,
)

registrar_manejadores_excepciones(app)  # convierte errores de negocio en respuestas HTTP
app.include_router(router_v1)           # todas las rutas (/postulantes, /postulantes/{id}/documentos)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Sirve para comprobar rápido que el servicio está vivo."""
    return {"status": "ok", "servicio": "servicio-postulantes"}
