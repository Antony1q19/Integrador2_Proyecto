"""Dependencias de este microservicio.

A diferencia del Gateway (que valida el JWT completo), acá solo se
confía en los headers que el Gateway ya firmó: `verificar_peticion_del_gateway`
bloquea cualquier llamada que no traiga una firma HMAC válida, y
`obtener_usuario_actual` simplemente lee la identidad que el Gateway ya
resolvió (`X-Usuario-Id` / `X-Usuario-Rol`) -este servicio nunca decodifica
JWT ni conoce contraseñas-.
"""
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from shared_kernel.security import verificar_firma_gateway


async def verificar_peticion_del_gateway(
    x_gateway_timestamp: str = Header(...),
    x_gateway_signature: str = Header(...),
) -> None:
    if not verificar_firma_gateway(
        settings.gateway_shared_secret, x_gateway_timestamp, x_gateway_signature
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Petición rechazada: no proviene del Gateway",
        )


async def obtener_usuario_actual(
    _: None = Depends(verificar_peticion_del_gateway),
    x_usuario_id: str = Header(...),
    x_usuario_rol: str = Header(...),
) -> dict:
    return {"id": x_usuario_id, "rol": x_usuario_rol}


def requerir_rol(*roles_permitidos: str):
    async def dependencia(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario["rol"] not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return usuario

    return dependencia
