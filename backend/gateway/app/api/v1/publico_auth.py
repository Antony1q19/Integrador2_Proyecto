"""Rutas públicas de autenticación para la app de postulantes (ANUNCIOS).

A diferencia de las rutas del ERP (/api/v1/auth/login), estas rutas:
  - Están dirigidas a personas externas (postulantes).
  - Las rutas SIN sesión (registro, login, recuperar y restablecer contraseña) tienen límite de
    peticiones por IP estricto (15/min). Las rutas CON sesión (/me, /perfil, /cv...) no: ya exigen
    un token válido, y la app las llama en cada pantalla.
  - Tienen bloqueo temporal por intentos fallidos de login (5 fallos en 15 min).
  - Tienen límite para recuperación de contraseñas (3 por correo/hora, 10 por IP/hora).
  - Emiten tokens JWT firmados con rol "Postulante" y audiencia "anuncios".
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import obtener_postulante_actual
from app.core.config import settings
from app.core.http_client import cabeceras_firmadas, obtener_cliente
from app.core.limite_peticiones import (
    limitar_por_ip,
    obtener_ip_cliente,
    limpiar_fallos_login,
    registrar_fallo_login,
    registrar_solicitud_recuperacion,
    verificar_bloqueo_login,
    verificar_limite_recuperacion,
)
from app.core.security import crear_token_acceso
from app.schemas.publico_auth import (
    AceptarTerminosGateway,
    LoginPostulanteGateway,
    MensajePublicoRespuesta,
    RecuperarPasswordGateway,
    RegistroPostulanteGateway,
    RestablecerPasswordGateway,
    TokenPostulanteRespuesta,
    UsuarioPostulanteDto,
    PerfilActualizarGateway,
)

router = APIRouter(prefix="/publico/auth", tags=["publico-auth"])

# Límite estricto (15 peticiones por minuto por IP) para las rutas que no piden sesión.
_LIMITE_SIN_SESION = [Depends(limitar_por_ip(15))]


def _emitir_token_postulante(usuario_dto: UsuarioPostulanteDto) -> str:
    """Emite un token JWT específico para la app ANUNCIOS con aud='anuncios' y rol='Postulante'."""
    claims = {
        "sub": usuario_dto.id,
        "postulanteId": usuario_dto.postulanteId,
        "email": usuario_dto.email,
        "nombre": usuario_dto.nombre,
        "rol": "Postulante",
        "aud": "anuncios",
    }
    return crear_token_acceso(
        claims,
        settings.jwt_secret,
        settings.jwt_minutos_expiracion,
        settings.jwt_algoritmo,
    )


@router.post(
    "/registro",
    response_model=TokenPostulanteRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=_LIMITE_SIN_SESION,
)
async def registrar_postulante(
    datos: RegistroPostulanteGateway,
    request: Request,
) -> TokenPostulanteRespuesta:
    """Registra una nueva cuenta de postulante o enlaza la invitación de RRHH."""
    ip = obtener_ip_cliente(request)
    cliente = obtener_cliente()
    url = f"{settings.url_servicio_postulantes}/auth/registro"

    cuerpo = datos.model_dump(mode="json")
    cuerpo["ip"] = ip

    respuesta = await cliente.post(
        url,
        json=cuerpo,
        headers=cabeceras_firmadas({"Content-Type": "application/json"}),
    )

    if respuesta.status_code >= 400:
        detalle = "No se pudo completar el registro"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    data = respuesta.json()
    usuario_dto = UsuarioPostulanteDto(
        id=data["usuarioId"],
        postulanteId=data["postulanteId"],
        email=data["email"],
        nombre=data["nombre"],
        requiereAceptarTerminos=data.get("requiereAceptarTerminos", False),
        versionTerminos=data.get("versionTerminos"),
    )

    token = _emitir_token_postulante(usuario_dto)
    return TokenPostulanteRespuesta(access_token=token, usuario=usuario_dto)


@router.post("/login", response_model=TokenPostulanteRespuesta, dependencies=_LIMITE_SIN_SESION)
async def login_postulante(
    datos: LoginPostulanteGateway,
    request: Request,
) -> TokenPostulanteRespuesta:
    """Inicia sesión para postulantes con protección anti-fuerza bruta."""
    ip = obtener_ip_cliente(request)

    # 1. Comprobar bloqueo temporal previo (5 fallos en 15 minutos)
    verificar_bloqueo_login(ip, datos.email)

    cliente = obtener_cliente()
    url = f"{settings.url_servicio_postulantes}/auth/login"

    respuesta = await cliente.post(
        url,
        json=datos.model_dump(mode="json"),
        headers=cabeceras_firmadas({"Content-Type": "application/json"}),
    )

    if respuesta.status_code != 200:
        # Si las credenciales fueron incorrectas (401), registramos el fallo
        if respuesta.status_code == status.HTTP_401_UNAUTHORIZED:
            registrar_fallo_login(ip, datos.email)

        detalle = "Credenciales incorrectas"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    # 2. Login exitoso: limpiar historial de fallos para este correo
    limpiar_fallos_login(datos.email)

    data = respuesta.json()
    usuario_dto = UsuarioPostulanteDto(
        id=data["usuarioId"],
        postulanteId=data["postulanteId"],
        email=data["email"],
        nombre=data["nombre"],
        requiereAceptarTerminos=data.get("requiereAceptarTerminos", False),
        versionTerminos=data.get("versionTerminos"),
    )

    token = _emitir_token_postulante(usuario_dto)
    return TokenPostulanteRespuesta(access_token=token, usuario=usuario_dto)


@router.post("/recuperar-password", response_model=MensajePublicoRespuesta, dependencies=_LIMITE_SIN_SESION)
async def recuperar_password(
    datos: RecuperarPasswordGateway,
    request: Request,
) -> MensajePublicoRespuesta:
    """Solicita envío de correo de restablecimiento con límite de solicitudes (spam)."""
    ip = obtener_ip_cliente(request)

    # Límite anti-spam: máx 3 por correo/hora y 10 por IP/hora
    verificar_limite_recuperacion(ip, datos.email)
    registrar_solicitud_recuperacion(ip, datos.email)

    cliente = obtener_cliente()
    url = f"{settings.url_servicio_postulantes}/auth/recuperar-password"

    cuerpo = {"email": datos.email, "ip": ip}
    respuesta = await cliente.post(
        url,
        json=cuerpo,
        headers=cabeceras_firmadas({"Content-Type": "application/json"}),
    )

    if respuesta.status_code >= 400:
        detalle = "No se pudo procesar la solicitud"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    return MensajePublicoRespuesta(
        mensaje="Si el correo está registrado, te enviamos un enlace. Revisa también tu carpeta de spam."
    )


@router.post("/restablecer-password", response_model=MensajePublicoRespuesta, dependencies=_LIMITE_SIN_SESION)
async def restablecer_password(
    datos: RestablecerPasswordGateway,
    request: Request,
) -> MensajePublicoRespuesta:
    """Aplica la nueva contraseña usando el token único de recuperación."""
    ip = obtener_ip_cliente(request)
    cliente = obtener_cliente()
    url = f"{settings.url_servicio_postulantes}/auth/restablecer-password"

    cuerpo = datos.model_dump(mode="json")
    cuerpo["ip"] = ip

    respuesta = await cliente.post(
        url,
        json=cuerpo,
        headers=cabeceras_firmadas({"Content-Type": "application/json"}),
    )

    if respuesta.status_code >= 400:
        detalle = "El enlace no es válido o venció"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    return MensajePublicoRespuesta(mensaje="Tu contraseña ha sido restablecida exitosamente")


@router.get("/me")
async def obtener_sesion_me(
    postulante: dict = Depends(obtener_postulante_actual),
) -> Response:
    """Devuelve los datos de la sesión verificando que no se haya modificado la contraseña posteriormente."""
    cliente = obtener_cliente()
    usuario_id = str(postulante.get("sub", ""))
    url = f"{settings.url_servicio_postulantes}/auth/me"

    respuesta = await cliente.get(
        url,
        headers=cabeceras_firmadas({"X-Usuario-Id": usuario_id}),
    )

    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada",
        )

    datos_me = respuesta.json()

    # Comprobación de invalidación de sesión por cambio de contraseña
    fecha_cambio_str = datos_me.get("passwordCambiadaEn")
    if fecha_cambio_str:
        fecha_cambio = datetime.fromisoformat(fecha_cambio_str)
        token_iat = postulante.get("iat")
        if token_iat is not None and token_iat < int(fecha_cambio.timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión ha expirado por cambio de contraseña. Inicia sesión nuevamente.",
            )

    return Response(
        content=respuesta.content,
        status_code=200,
        media_type="application/json",
    )


@router.post("/aceptar-terminos", response_model=MensajePublicoRespuesta)
async def aceptar_terminos(
    datos: AceptarTerminosGateway,
    request: Request,
    postulante: dict = Depends(obtener_postulante_actual),
) -> MensajePublicoRespuesta:
    """Permite a un postulante autenticado aceptar una nueva versión de términos y condiciones."""
    ip = obtener_ip_cliente(request)
    cliente = obtener_cliente()
    usuario_id = str(postulante.get("sub", ""))
    url = f"{settings.url_servicio_postulantes}/auth/aceptar-terminos"

    cuerpo = {"version": datos.version, "ip": ip}
    respuesta = await cliente.post(
        url,
        json=cuerpo,
        headers=cabeceras_firmadas(
            {"Content-Type": "application/json", "X-Usuario-Id": usuario_id}
        ),
    )

    if respuesta.status_code >= 400:
        detalle = "No se pudo registrar la aceptación de términos"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    return MensajePublicoRespuesta(mensaje="Términos y condiciones aceptados correctamente")

@router.patch("/perfil", response_model=dict)
async def actualizar_perfil(
    datos: PerfilActualizarGateway,
    request: Request,
    postulante: dict = Depends(obtener_postulante_actual),
) -> Response:
    """Permite al postulante actualizar sus propios datos de perfil."""
    cliente = obtener_cliente()
    usuario_id = str(postulante.get("sub", ""))
    url = f"{settings.url_servicio_postulantes}/auth/me/perfil"

    cuerpo = datos.model_dump(exclude_unset=True, mode="json")

    respuesta = await cliente.patch(
        url,
        json=cuerpo,
        headers=cabeceras_firmadas(
            {"Content-Type": "application/json", "X-Usuario-Id": usuario_id}
        ),
    )

    if respuesta.status_code >= 400:
        detalle = "No se pudo actualizar el perfil"
        try:
            datos_err = respuesta.json()
            detalle = datos_err.get("detail", detalle)
        except Exception:
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)

    return Response(
        content=respuesta.content,
        status_code=200,
        media_type="application/json",
    )


# ---------------------------------------------------------------------------
# CV del postulante
# ---------------------------------------------------------------------------
# Solo el documento de tipo CV; los demás documentos son internos del ERP.
# El archivo se reenvía tal cual (multipart) sin procesarlo aquí.
_TAMANO_MAXIMO_CV_BYTES = 6 * 1024 * 1024  # 5 MB del archivo + margen del multipart


def _reenviar_respuesta_cv(respuesta, mensaje_error: str) -> Response:
    """Convierte errores del servicio en HTTPException o devuelve la respuesta tal cual."""
    if respuesta.status_code >= 400:
        detalle = mensaje_error
        try:
            detalle = respuesta.json().get("detail", detalle)
        except Exception:  # noqa: BLE001
            pass
        raise HTTPException(status_code=respuesta.status_code, detail=detalle)
    cabeceras = {}
    if "content-disposition" in respuesta.headers:
        cabeceras["Content-Disposition"] = respuesta.headers["content-disposition"]
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type=respuesta.headers.get("content-type"),
        headers=cabeceras,
    )


@router.post("/cv", status_code=status.HTTP_201_CREATED)
async def subir_cv(
    request: Request,
    postulante: dict = Depends(obtener_postulante_actual),
) -> Response:
    """Sube (o reemplaza) el CV del postulante autenticado."""
    if int(request.headers.get("content-length") or 0) > _TAMANO_MAXIMO_CV_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el máximo de 5 MB",
        )
    respuesta = await obtener_cliente().post(
        f"{settings.url_servicio_postulantes}/auth/me/cv",
        content=await request.body(),
        headers=cabeceras_firmadas(
            {
                "Content-Type": request.headers.get("content-type", ""),
                "X-Usuario-Id": str(postulante.get("sub", "")),
            }
        ),
    )
    return _reenviar_respuesta_cv(respuesta, "No se pudo subir el CV")


@router.get("/cv/contenido")
async def obtener_cv(postulante: dict = Depends(obtener_postulante_actual)) -> Response:
    """Devuelve el archivo del CV del postulante autenticado."""
    respuesta = await obtener_cliente().get(
        f"{settings.url_servicio_postulantes}/auth/me/cv/contenido",
        headers=cabeceras_firmadas({"X-Usuario-Id": str(postulante.get("sub", ""))}),
    )
    return _reenviar_respuesta_cv(respuesta, "No se pudo obtener el CV")


@router.delete("/cv", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_cv(postulante: dict = Depends(obtener_postulante_actual)) -> Response:
    """Elimina el CV del postulante autenticado."""
    respuesta = await obtener_cliente().delete(
        f"{settings.url_servicio_postulantes}/auth/me/cv",
        headers=cabeceras_firmadas({"X-Usuario-Id": str(postulante.get("sub", ""))}),
    )
    if respuesta.status_code >= 400:
        _reenviar_respuesta_cv(respuesta, "No se pudo eliminar el CV")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
