"""Punto de entrada de servicio-postulantes (ADR-002).

Dueño del dominio "identidad del postulante": datos personales,
documentos y consentimientos. Solo el Gateway lo llama (nunca el
Front-End directo); cada petición trae la firma HMAC del Gateway, que
`app.api.deps` verifica en cada endpoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import router as router_v1
from app.core.config import settings
from app.core.database import engine
from shared_kernel.database import Base
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("servicio-postulantes", settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.entorno == "desarrollo":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Servicio de Postulantes",
    description="Identidad del postulante: datos personales, documentos y consentimientos.",
    version="1.0.0",
    lifespan=lifespan,
)

registrar_manejadores_excepciones(app)
app.include_router(router_v1)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "servicio": "servicio-postulantes"}
