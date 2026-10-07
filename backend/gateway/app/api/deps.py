"""Comprobaciones de seguridad reutilizables ("dependencias" de FastAPI).

Se usan así en cualquier endpoint:

    def mi_endpoint(usuario = Depends(obtener_usuario_actual)):      # trabajadores del ERP (Admin, RRHH, Supervisor)
    def mi_endpoint(usuario = Depends(obtener_usuario_con_cambio_pendiente)):  # ídem, aunque tenga clave temporal
    def mi_endpoint(usuario = Depends(requerir_rol("Admin"))):       # solo ciertos roles del ERP
    def mi_endpoint(postulante = Depends(obtener_postulante_actual)): # postulante de ANUNCIOS

FastAPI ejecuta la comprobación ANTES de entrar al endpoint; si falla, responde
el error (401 o 403) y el endpoint ni se ejecuta.

Un token firmado y no vencido NO basta: además se comprueba contra la base de datos que la cuenta
siga activa, que su rol no haya cambiado y que su contraseña no haya cambiado DESPUÉS de emitir el
token. Así, suspender a alguien, cambiarle el rol o restablecerle la clave cierra sus sesiones
abiertas al instante (no hay que esperar a que venza el token). Ver core/cache_cuentas.py.
"""
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import cache_cuentas
from app.core.config import settings
from app.core.database import obtener_sesion_lectura
from app.core.http_client import cabeceras_firmadas, obtener_cliente
from app.domain.usuarios import ROLES_INTERNOS_ERP
from app.infrastructure.models import Usuario
from shared_kernel.security import JWTError, decodificar_token


def _leer_token(authorization: str) -> dict:
    """Comprueba el formato "Bearer <token>", la firma y el vencimiento; devuelve su contenido."""
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


def _emitido_antes_de(payload: dict, momento: datetime | None) -> bool:
    """¿El token se emitió antes de `momento` (ej. del último cambio de contraseña)?"""
    if momento is None:
        return False
    if momento.tzinfo is None:  # (algunas bases devuelven la fecha sin zona: está guardada en UTC)
        momento = momento.replace(tzinfo=timezone.utc)
    if payload.get("iat_ms") is not None:  # tokens nuevos: precisión de milisegundos
        return int(payload["iat_ms"]) < int(momento.timestamp() * 1000)
    iat = payload.get("iat")  # tokens emitidos antes de agregar "iat_ms"
    return iat is not None and int(iat) < int(momento.timestamp())


def _sesion_invalida(detalle: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detalle)


async def _cuenta_erp(sesion: AsyncSession, usuario_id: str) -> dict | None:
    """Estado actual de la cuenta del trabajador (de la memoria de unos segundos o de la base)."""
    clave = f"erp:{usuario_id}"
    datos = cache_cuentas.recordado(clave)
    if datos is cache_cuentas.NO_GUARDADO:
        cuenta = await sesion.get(Usuario, usuario_id)
        datos = (
            None
            if cuenta is None
            else {
                "estado": cuenta.estado,
                "rol": cuenta.rol,
                "empresas_visibles": list(cuenta.empresas_visibles or []),
                "password_cambiada_en": cuenta.password_cambiada_en,
            }
        )
        cache_cuentas.recordar(clave, datos)
    return datos


async def obtener_usuario_con_cambio_pendiente(
    authorization: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> dict:
    """Lee el token que manda el navegador y devuelve los datos del trabajador del ERP.

    El token llega en la cabecera:  Authorization: Bearer <token>
    Devuelve algo como {"sub": "<id>", "email": "...", "rol": "Admin", "nombre": "...", "aud": "erp",
    "empresas_visibles": [1, 3]} (las empresas salen de la base de datos, no del token).
    Rechaza con 403 a cualquier token con rol "Postulante" o audiencia "anuncios".

    OJO: deja pasar a quien todavía tiene la contraseña temporal. Solo la usa la ruta para cambiar
    la propia contraseña; todas las demás usan `obtener_usuario_actual`.
    """
    # 1) y 2) Formato, firma y vencimiento del token.
    payload = _leer_token(authorization)

    # 3) Separación estricta ERP / ANUNCIOS: un postulante no debe acceder a ninguna ruta del ERP.
    if payload.get("rol") == "Postulante" or payload.get("aud") == "anuncios":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para esta acción",
        )

    # 4) Debe pertenecer al ERP y tener rol interno válido.
    if payload.get("aud") != "erp" or payload.get("rol") not in ROLES_INTERNOS_ERP:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para esta acción",
        )

    # 5) La cuenta debe seguir igual que cuando se emitió el token.
    cuenta = await _cuenta_erp(sesion, str(payload.get("sub", "")))
    if cuenta is None or cuenta["estado"] != "Activo":
        raise _sesion_invalida("Tu cuenta ya no está activa. Contacta a un administrador.")
    if cuenta["rol"] != payload.get("rol"):
        raise _sesion_invalida("Tus permisos cambiaron. Inicia sesión nuevamente.")
    if _emitido_antes_de(payload, cuenta["password_cambiada_en"]):
        raise _sesion_invalida("Tu contraseña cambió. Inicia sesión nuevamente.")

    return {**payload, "empresas_visibles": cuenta["empresas_visibles"]}


async def obtener_usuario_actual(
    usuario: dict = Depends(obtener_usuario_con_cambio_pendiente),
) -> dict:
    """Como `obtener_usuario_con_cambio_pendiente`, pero además rechaza (403) a quien todavía no
    cambió la contraseña temporal que le generó un Admin: hasta cambiarla, no puede usar nada más
    del ERP (ni el reenvío a los microservicios). Es la que usan casi todas las rutas."""
    if usuario.get("cambiarPassword"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes cambiar tu contraseña temporal antes de continuar (Mi perfil → Cambiar contraseña)",
        )
    return usuario


async def _cuenta_postulante(usuario_id: str) -> dict | None:
    """Estado actual de la cuenta del postulante (vive en servicio-postulantes)."""
    clave = f"anuncios:{usuario_id}"
    datos = cache_cuentas.recordado(clave)
    if datos is cache_cuentas.NO_GUARDADO:
        respuesta = await obtener_cliente().get(
            f"{settings.url_servicio_postulantes}/auth/estado-sesion",
            headers=cabeceras_firmadas({"X-Usuario-Id": usuario_id}),
        )
        if respuesta.status_code == 404:
            datos = None
        elif respuesta.status_code == 200:
            cuerpo = respuesta.json()
            cambio = cuerpo.get("passwordCambiadaEn")
            datos = {
                "estado": cuerpo.get("estado"),
                "password_cambiada_en": datetime.fromisoformat(cambio) if cambio else None,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo verificar la sesión. Intenta nuevamente.",
            )
        cache_cuentas.recordar(clave, datos)
    return datos


async def obtener_postulante_actual(authorization: str = Header(...)) -> dict:
    """Lee y valida el token emitido para la app ANUNCIOS.

    Exige firma correcta, que no haya expirado, audiencia 'anuncios' y rol 'Postulante'.
    Si se intenta usar un token del ERP, se rechaza. Además, la cuenta debe seguir activa y su
    contraseña no debe haber cambiado después de emitir el token (ej. tras "olvidé mi contraseña").
    """
    payload = _leer_token(authorization)

    if payload.get("aud") != "anuncios" or payload.get("rol") != "Postulante":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este recurso es exclusivo para postulantes de la app ANUNCIOS",
        )

    cuenta = await _cuenta_postulante(str(payload.get("sub", "")))
    if cuenta is None or cuenta["estado"] != "Activo":
        raise _sesion_invalida("Sesión inválida o expirada")
    if _emitido_antes_de(payload, cuenta["password_cambiada_en"]):
        raise _sesion_invalida("La sesión ha expirado por cambio de contraseña. Inicia sesión nuevamente.")

    return payload


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
