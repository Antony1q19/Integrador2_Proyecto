"""Endpoints de autenticación. El Gateway es el único lugar del sistema
que conoce contraseñas y emite JWT (ADR-002: "centraliza autenticación y
CORS"); los microservicios internos solo los verifican."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import obtener_sesion
from app.core.security import crear_token_acceso, hash_password, verificar_password
from app.infrastructure.models import Usuario
from app.schemas.auth import CredencialesLogin, TokenRespuesta, UsuarioRegistro

router = APIRouter(prefix="/auth", tags=["auth"])


def _emitir_token(usuario: Usuario) -> TokenRespuesta:
    token = crear_token_acceso(
        {"sub": usuario.id, "email": usuario.email, "rol": usuario.rol, "nombre": usuario.nombre},
        settings.jwt_secret,
        settings.jwt_minutos_expiracion,
        settings.jwt_algoritmo,
    )
    return TokenRespuesta(
        access_token=token,
        rol=usuario.rol,
        nombre=usuario.nombre,
        email=usuario.email,
        empresasVisibles=usuario.empresas_visibles,
    )


@router.post("/login", response_model=TokenRespuesta)
async def login(
    credenciales: CredencialesLogin, sesion: AsyncSession = Depends(obtener_sesion)
) -> TokenRespuesta:
    resultado = await sesion.execute(select(Usuario).where(Usuario.email == credenciales.email))
    usuario = resultado.scalar_one_or_none()
    if usuario is None or not verificar_password(credenciales.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas"
        )
    if usuario.estado != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está suspendida. Contacta a un administrador.",
        )
    return _emitir_token(usuario)


@router.post("/registro", response_model=TokenRespuesta, status_code=status.HTTP_201_CREATED)
async def registro(
    datos: UsuarioRegistro, sesion: AsyncSession = Depends(obtener_sesion)
) -> TokenRespuesta:
    # Auto-registro público (usado por ANUNCIOS): siempre crea rol
    # "Postulante". Los roles internos del ERP (Admin/RRHH/Supervisor) se
    # crean desde "Perfil -> Usuarios" por un Admin ya autenticado -ver
    # `crear_usuario_interno` más abajo-, nunca por este endpoint abierto.
    existente = await sesion.execute(select(Usuario).where(Usuario.email == datos.email))
    if existente.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

    usuario = Usuario(
        email=datos.email,
        nombre=datos.nombre,
        password_hash=hash_password(datos.password),
        rol="Postulante",
    )
    sesion.add(usuario)
    await sesion.commit()
    await sesion.refresh(usuario)
    return _emitir_token(usuario)
