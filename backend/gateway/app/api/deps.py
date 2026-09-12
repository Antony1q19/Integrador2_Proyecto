"""Dependencias FastAPI del Gateway: valida el JWT del header
`Authorization` y expone el usuario autenticado a cualquier endpoint."""
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from shared_kernel.security import JWTError, decodificar_token


async def obtener_usuario_actual(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Encabezado Authorization inválido (se espera 'Bearer <token>')",
        )
    token = authorization.removeprefix("Bearer ")
    try:
        return decodificar_token(token, settings.jwt_secret, settings.jwt_algoritmo)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado"
        ) from exc


def requerir_rol(*roles_permitidos: str):
    """Ej: `Depends(requerir_rol("Admin", "RRHH"))` en cualquier endpoint
    que solo deba usar el personal interno del ERP."""

    async def dependencia(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario.get("rol") not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return usuario

    return dependencia
