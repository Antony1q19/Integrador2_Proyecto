"""Login del ERP (trabajadores internos: Admin, RRHH y Supervisor).

Ruta (prefijo /auth + /api/v1):
    POST /api/v1/auth/login      → iniciar sesión en el ERP

Este login SOLO mira la tabla de trabajadores internos (`usuarios` del Gateway). Los
postulantes tendrán su propio login, separado, para la app ANUNCIOS (contra la tabla
`usuarios` de servicio-postulantes); todavía no está hecho.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import obtener_sesion
from app.core.limite_peticiones import (
    limpiar_fallos_login,
    obtener_ip_cliente,
    registrar_fallo_login,
    verificar_bloqueo_login,
)
from app.core.security import HASH_DUMMY, crear_token_acceso, verificar_password
from app.domain.usuarios import ROLES_INTERNOS_ERP
from app.infrastructure.models import Usuario
from app.schemas.auth import CredencialesLogin, TokenRespuesta

router = APIRouter(prefix="/auth", tags=["auth"])


def _emitir_token(usuario: Usuario) -> TokenRespuesta:
    """Crea el token de sesión de un usuario y arma la respuesta de login."""
    # Estos 4 datos viajan DENTRO del token (firmados). Los microservicios
    # leen de aquí el rol y el id de quien hace la petición.
    token = crear_token_acceso(
        {
            "sub": usuario.id,
            "email": usuario.email,
            "rol": usuario.rol,
            "nombre": usuario.nombre,
            "aud": "erp",
            # True = todavía tiene la contraseña temporal: este token solo sirve para cambiarla
            # (ver obtener_usuario_actual en api/deps.py).
            "cambiarPassword": usuario.debe_cambiar_password,
        },
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
        debeCambiarPassword=usuario.debe_cambiar_password,
    )


@router.post("/login", response_model=TokenRespuesta)
async def login(
    credenciales: CredencialesLogin,
    request: Request,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> TokenRespuesta:
    """Inicia sesión con correo y contraseña.

    Protección contra fuerza bruta (la misma que el login de postulantes): tras 5 intentos
    fallidos en 15 minutos, desde la misma IP o contra el mismo correo, responde 429.
    """
    # PASO 0: ¿esta IP o este correo están bloqueados por demasiados intentos fallidos?
    ip = obtener_ip_cliente(request)
    verificar_bloqueo_login(ip, credenciales.email)

    # PASO 1: buscar en la tabla `usuarios` a un TRABAJADOR con ese correo. Si en la tabla
    # quedara alguna cuenta con otro rol (ej. "Postulante", de antes de separar los logins),
    # para el ERP es como si no existiera.
    # lower(): "Admin@Test.com" y "admin@test.com" son el mismo correo.
    resultado = await sesion.execute(
        select(Usuario).where(
            func.lower(Usuario.email) == credenciales.email.strip().lower(),
            Usuario.rol.in_(ROLES_INTERNOS_ERP),
        )
    )
    usuario = resultado.scalar_one_or_none()  # None si no hay nadie con ese correo

    # PASO 2: ¿existe y la contraseña coincide con el hash guardado?
    # Si el correo no existe o la clave está mal, se responde EL MISMO error,
    # para no revelar si un correo está registrado o no.
    # Si el correo no existe se compara igual contra un hash falso (HASH_DUMMY): así la respuesta
    # tarda lo mismo y nadie puede deducir, midiendo el tiempo, qué correos están registrados.
    hash_a_comparar = usuario.password_hash if usuario is not None else HASH_DUMMY
    password_correcta = verificar_password(credenciales.password, hash_a_comparar)
    if usuario is None or not password_correcta:
        registrar_fallo_login(ip, credenciales.email)
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

    # PASO 4: todo bien → se olvidan los intentos fallidos y se entrega el token.
    limpiar_fallos_login(credenciales.email)
    return _emitir_token(usuario)
