"""Punto de arranque del GATEWAY (la "puerta de entrada" del backend).

¿Qué es el Gateway?
Piensa en la recepción de un edificio de oficinas: TODOS los visitantes (los
frontends ERP y ANUNCIOS) pasan primero por ahí, y la recepción decide a qué
oficina (microservicio) mandarlos. Los microservicios nunca reciben visitas
directas.

El Gateway hace tres cosas:
  1. LOGIN: comprueba usuario y contraseña y entrega un token (api/v1/auth.py).
  2. USUARIOS: crear/editar trabajadores del ERP (api/v1/usuarios.py).
  3. REENVÍO: revisa el token y pasa la petición al microservicio correcto
     (api/v1/proxy.py).
Además configura CORS: el permiso para que los frontends (puertos 3000 y 3001)
puedan llamar a este servidor desde el navegador.

Para ver todas las rutas disponibles, con el backend encendido abre:
    http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, proxy, usuarios
from app.core.config import settings
from app.core.database import engine
from app.core.http_client import cerrar_cliente
from app.infrastructure.seed import sembrar_datos_de_prueba
from shared_kernel.database import Base
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("gateway", settings.log_level)


# ---------------------------------------------------------------------------
# Qué pasa al encender y al apagar el servidor
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # AL ENCENDER: en modo "desarrollo" crea las tablas que falten y siembra
    # los datos de prueba (infrastructure/seed.py). En producción, las tablas
    # se manejarían con migraciones de Alembic (carpeta alembic/), no así.
    if settings.entorno == "desarrollo":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await sembrar_datos_de_prueba()

    yield  # <- aquí el servidor queda funcionando y atendiendo peticiones

    # AL APAGAR: cierra la conexión HTTP que usamos para hablar con los microservicios.
    await cerrar_cliente()


# ---------------------------------------------------------------------------
# La aplicación
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Gateway - Sistema de Reclutamiento",
    description="Puerta de entrada: login, usuarios del ERP y reenvío hacia los microservicios.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: sin esto, el navegador bloquearía las llamadas desde los frontends.
# Solo se permiten los orígenes escritos en CORS_ORIGINS (archivo .env).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.lista_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_manejadores_excepciones(app)

# Rutas. IMPORTANTE: el orden importa. FastAPI prueba las rutas en el orden
# en que se registran, y "proxy" acepta CUALQUIER dirección bajo /api/v1, por
# eso tiene que ir SIEMPRE al final; si no, se "comería" /auth y /usuarios.
app.include_router(auth.router, prefix="/api/v1")       # /api/v1/auth/...
app.include_router(usuarios.router, prefix="/api/v1")   # /api/v1/usuarios/...
app.include_router(proxy.router, prefix="/api/v1")      # /api/v1/postulantes/... (y lo demás)


@app.get("/health", tags=["health"])
async def health() -> dict:
    """Sirve para comprobar rápido que el servicio está vivo."""
    return {"status": "ok", "servicio": "gateway"}
