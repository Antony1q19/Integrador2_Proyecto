"""Comprobaciones de seguridad de este microservicio.

A diferencia del Gateway, aquí NO se revisa el token de login (eso ya lo hizo el
Gateway). Aquí solo se comprueban dos cosas:

  1. Que la petición traiga la FIRMA secreta del Gateway → si no, alguien está
     intentando llamar a este servicio directo, y se rechaza (error 403).
  2. Quién es el usuario (id y rol), que el Gateway ya dejó escrito en dos
     cabeceras: X-Usuario-Id y X-Usuario-Rol.

Se usan en los endpoints así:
    Depends(obtener_usuario_actual)                   → cualquier usuario válido
    Depends(requerir_rol("Admin", "RRHH", ...))       → solo esos roles
"""
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from shared_kernel.security import verificar_firma_gateway
from shared_kernel.visibilidad import parsear_empresas


async def verificar_peticion_del_gateway(
    x_gateway_timestamp: str = Header(...),
    x_gateway_signature: str = Header(...),
) -> None:
    """Rechaza (403) toda petición que no traiga una firma válida del Gateway."""
    if not verificar_firma_gateway(
        settings.gateway_shared_secret, x_gateway_timestamp, x_gateway_signature
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Petición rechazada: no proviene del Gateway",
        )


async def obtener_usuario_actual(
    _: None = Depends(verificar_peticion_del_gateway),  # primero se exige la firma
    x_usuario_id: str = Header(...),
    x_usuario_rol: str = Header(...),
    x_usuario_empresas: str | None = Header(default=None),
) -> dict:
    """Devuelve quién hace la petición: {"id": ..., "rol": ..., "empresas": ...}.

    "empresas" son los ids de las empresas que puede ver (RRHH/Supervisor) o None si no
    tiene filtro (ver shared_kernel/visibilidad.py)."""
    return {
        "id": x_usuario_id,
        "rol": x_usuario_rol,
        "empresas": parsear_empresas(x_usuario_rol, x_usuario_empresas),
    }


def requerir_rol(*roles_permitidos: str):
    """Exige que el usuario tenga UNO de los roles indicados (si no, error 403)."""

    async def dependencia(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario["rol"] not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return usuario

    return dependencia
