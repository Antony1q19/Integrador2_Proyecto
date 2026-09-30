"""Comprobaciones de seguridad reutilizables ("dependencias" de FastAPI).

Se usan así en cualquier endpoint:

    def mi_endpoint(usuario = Depends(obtener_usuario_actual)):   # cualquier usuario con sesión
    def mi_endpoint(usuario = Depends(requerir_rol("Admin"))):    # solo ciertos roles

FastAPI ejecuta la comprobación ANTES de entrar al endpoint; si falla, responde
el error (401 o 403) y el endpoint ni se ejecuta.
"""
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from shared_kernel.security import JWTError, decodificar_token


async def obtener_usuario_actual(authorization: str = Header(...)) -> dict:
    """Lee el token que manda el navegador y devuelve los datos del usuario.

    El token llega en la cabecera:  Authorization: Bearer <token>
    Devuelve algo como {"sub": "<id>", "email": "...", "rol": "Admin", "nombre": "..."}.
    """
    # 1) La cabecera debe empezar con "Bearer ".
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Encabezado Authorization inválido (se espera 'Bearer <token>')",
        )
    token = authorization.removeprefix("Bearer ")

    # 2) El token debe ser auténtico (firma correcta) y no estar vencido.
    try:
        return decodificar_token(token, settings.jwt_secret, settings.jwt_algoritmo)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado"
        ) from exc


def requerir_rol(*roles_permitidos: str):
    """Exige que el usuario tenga UNO de los roles indicados (si no, error 403).

    Ejemplo: requerir_rol("Admin", "RRHH") deja pasar a Admin y a RRHH, y
    rechaza a Supervisor y a Postulante.
    """

    async def dependencia(usuario: dict = Depends(obtener_usuario_actual)) -> dict:
        if usuario.get("rol") not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return usuario

    return dependencia
