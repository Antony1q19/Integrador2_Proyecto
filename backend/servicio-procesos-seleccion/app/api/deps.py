"""Comprobaciones de seguridad de este microservicio.

A diferencia del Gateway, aquí NO se revisa el token de login (eso ya lo hizo el
Gateway). Aquí solo se comprueban dos cosas:

  1. Que la petición traiga la FIRMA secreta del Gateway → si no, alguien está
     intentando llamar a este servicio directo, y se rechaza (error 403).
  2. Quién es el usuario (id, rol y nombre), que el Gateway ya dejó escrito en
     tres cabeceras: X-Usuario-Id, X-Usuario-Rol y X-Usuario-Nombre.

Se usan en los endpoints así:
    Depends(obtener_usuario_actual)                   → cualquier usuario válido
    Depends(requerir_rol("Admin", "RRHH", ...))       → solo esos roles
"""
from urllib.parse import unquote

from fastapi import Depends, Header, HTTPException, Request, status

from app.core.config import settings
from shared_kernel.firma_http import peticion_firmada_por_gateway
from shared_kernel.visibilidad import parsear_empresas


async def verificar_peticion_del_gateway(request: Request) -> None:
    """Rechaza (403) toda petición que no traiga una firma válida del Gateway: correcta para ESTE
    método, ESTA ruta y ESTA identidad, reciente (30 s) y no repetida (ver shared_kernel/firma_http.py)."""
    if not peticion_firmada_por_gateway(request, settings.gateway_shared_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Petición rechazada: no proviene del Gateway",
        )


async def obtener_usuario_actual(
    _: None = Depends(verificar_peticion_del_gateway),
    x_usuario_id: str = Header(...),
    x_usuario_rol: str = Header(...),
    x_usuario_nombre: str = Header(default=""),
    x_usuario_empresas: str | None = Header(default=None),
    x_usuario_postulante_id: str | None = Header(default=None),
) -> dict:
    """Devuelve quién hace la petición.

    Incluye "postulante_id" cuando el usuario es un postulante de la app ANUNCIOS
    (el Gateway lo lee del claim "postulanteId" del JWT); para trabajadores del ERP
    queda en None.
    """
    return {
        "id": x_usuario_id,
        "rol": x_usuario_rol,
        "nombre": unquote(x_usuario_nombre),
        "empresas": parsear_empresas(x_usuario_rol, x_usuario_empresas),
        "postulante_id": x_usuario_postulante_id or None,
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
