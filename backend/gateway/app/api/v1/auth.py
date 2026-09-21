"""Login y registro.

Este archivo es el ÚNICO lugar del sistema donde se comprueban contraseñas y se
entregan tokens de sesión. Las rutas quedan así (prefijo /auth + /api/v1):
    POST /api/v1/auth/login      → iniciar sesión
    POST /api/v1/auth/registro   → crear cuenta de postulante (para ANUNCIOS)
"""
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
    """Crea el token de sesión de un usuario y arma la respuesta de login."""
    # Estos 4 datos viajan DENTRO del token (firmados). Los microservicios
    # leen de aquí el rol y el id de quien hace la petición.
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
    """Inicia sesión con correo y contraseña."""
    # PASO 1: buscar en la tabla `usuarios` a alguien con ese correo.
    resultado = await sesion.execute(select(Usuario).where(Usuario.email == credenciales.email))
    usuario = resultado.scalar_one_or_none()  # None si no hay nadie con ese correo

    # PASO 2: ¿existe y la contraseña coincide con el hash guardado?
    # Si el correo no existe o la clave está mal, se responde EL MISMO error,
    # para no revelar si un correo está registrado o no.
    if usuario is None or not verificar_password(credenciales.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas"
        )

    # PASO 3: la cuenta debe estar "Activo" (una cuenta Suspendida o
    # Eliminada no puede entrar aunque la contraseña sea correcta).
    if usuario.estado != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está suspendida. Contacta a un administrador.",
        )

    # PASO 4: todo bien → se entrega el token.
    return _emitir_token(usuario)


@router.post("/registro", response_model=TokenRespuesta, status_code=status.HTTP_201_CREATED)
async def registro(
    datos: UsuarioRegistro, sesion: AsyncSession = Depends(obtener_sesion)
) -> TokenRespuesta:
    """Crea una cuenta nueva. Es pública (la usará la app ANUNCIOS).

    SIEMPRE crea el rol "Postulante". Los roles del ERP (Admin, RRHH,
    Supervisor) NO se pueden crear por aquí: solo un Admin los crea desde
    /perfil (ver usuarios.py).
    """
    # PASO 1: el correo no debe estar ya registrado.
    busqueda = await sesion.execute(select(Usuario).where(Usuario.email == datos.email))
    if busqueda.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

    # PASO 2: guardar al usuario nuevo (con la contraseña convertida en hash).
    usuario = Usuario(
        email=datos.email,
        nombre=datos.nombre,
        password_hash=hash_password(datos.password),
        rol="Postulante",
    )
    sesion.add(usuario)
    await sesion.commit()       # "commit" = confirmar y guardar de verdad en la base
    await sesion.refresh(usuario)  # vuelve a leerlo (trae los valores por defecto: id, estado...)

    # PASO 3: se le entrega el token para que quede con sesión iniciada.
    return _emitir_token(usuario)
