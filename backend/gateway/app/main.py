"""Punto de entrada del API Gateway / BFF (ADR-002).

Responsabilidades: autenticación centralizada (`/api/v1/auth`), CORS, y
enrutamiento de las peticiones del Front-End hacia cada microservicio de
dominio (`/api/v1/{postulantes,empresas,anuncios,procesos,evaluaciones}`).
Los Front-End (ERP y ANUNCIOS) nunca llaman a los microservicios
directamente: siempre pasan por acá.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1 import auth, proxy, usuarios
from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.core.http_client import cerrar_cliente
from app.core.security import hash_password
from app.infrastructure.models import Usuario
from shared_kernel.database import Base
from shared_kernel.exceptions import registrar_manejadores_excepciones
from shared_kernel.logging import configurar_logging

configurar_logging("gateway", settings.log_level)


# Mismas 3 cuentas y mismo password genérico que
# `features/login/sesion/mockAuth.ts` del ERP (MOCK_USERS), para que
# cualquiera que ya usaba el mock pueda loguearse igual contra el backend
# real sin aprender credenciales nuevas.
_USUARIOS_SEED = [
    {"email": "admin@test.com", "nombre": "Leonardo Morales", "rol": "Admin"},
    {"email": "rrhh@test.com", "nombre": "Xavier Ibarra", "rol": "RRHH"},
    {"email": "super@test.com", "nombre": "Marco Alanya", "rol": "Supervisor"},
]
_PASSWORD_SEED = "123456"


async def _sembrar_usuarios_de_prueba() -> None:
    """Solo en desarrollo: crea las 3 cuentas de arriba si no existen
    todavía (una por rol interno del ERP). Idempotente -se puede llamar en
    cada arranque, no duplica nada-."""
    async with SessionLocal() as sesion:
        for datos in _USUARIOS_SEED:
            existente = await sesion.execute(select(Usuario).where(Usuario.email == datos["email"]))
            if existente.scalar_one_or_none() is not None:
                continue
            sesion.add(
                Usuario(
                    email=datos["email"],
                    nombre=datos["nombre"],
                    password_hash=hash_password(_PASSWORD_SEED),
                    rol=datos["rol"],
                )
            )
        await sesion.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # En desarrollo se crean las tablas automáticamente; en producción esto
    # lo maneja Alembic (ver gateway/alembic/).
    if settings.entorno == "desarrollo":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await _sembrar_usuarios_de_prueba()
    yield
    await cerrar_cliente()


app = FastAPI(
    title="Gateway - Sistema de Reclutamiento",
    description="BFF que centraliza autenticación, CORS y enrutamiento hacia los microservicios de dominio.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.lista_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_manejadores_excepciones(app)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(usuarios.router, prefix="/api/v1")
# El catch-all de "proxy" va AL FINAL a propósito: su ruta "/{servicio}{ruta:path}"
# matchea cualquier cosa bajo /api/v1, así que si fuera antes se comería
# también /api/v1/usuarios (interpretándolo como un microservicio
# inexistente llamado "usuarios" y devolviendo 404).
app.include_router(proxy.router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "servicio": "gateway"}
