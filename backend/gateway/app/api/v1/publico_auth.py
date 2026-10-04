"""Rutas públicas de autenticación para la app de postulantes (ANUNCIOS).

A diferencia de las rutas del ERP (/api/v1/auth/login), estas rutas:
  - Están dirigidas a personas externas (postulantes).
  - Tienen límite de peticiones por IP más estricto (15/min).
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

router = APIRouter(
    prefix="/publico/auth",
    tags=["publico-auth"],
    dependencies=[Depends(limitar_por_ip(15))],  # Límite estricto de 15 peticiones por minuto por IP
)


def _obtener_ip_cliente(request: Request) -> str:
    """Extrae la IP del cliente de la cabecera X-Forwarded-For o de la conexión directa."""
    cabecera_forwarded = request.headers.get("x-forwarded-for")
    if cabecera_forwarded:
        return cabecera_forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


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


@router.post("/registro", response_model=TokenPostulanteRespuesta, status_code=status.HTTP_201_CREATED)
async def registrar_postulante(
    datos: RegistroPostulanteGateway,
    request: Request,
) -> TokenPostulanteRespuesta:
    """Registra una nueva cuenta de postulante o enlaza la invitación de RRHH."""
    ip = _obtener_ip_cliente(request)
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


@router.post("/login", response_model=TokenPostulanteRespuesta)
async def login_postulante(
    datos: LoginPostulanteGateway,
    request: Request,
) -> TokenPostulanteRespuesta:
    """Inicia sesión para postulantes con protección anti-fuerza bruta."""
    ip = _obtener_ip_cliente(request)

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


@router.post("/recuperar-password", response_model=MensajePublicoRespuesta)
async def recuperar_password(
    datos: RecuperarPasswordGateway,
    request: Request,
) -> MensajePublicoRespuesta:
    """Solicita envío de correo de restablecimiento con límite de solicitudes (spam)."""
    ip = _obtener_ip_cliente(request)

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


@router.post("/restablecer-password", response_model=MensajePublicoRespuesta)
async def restablecer_password(
    datos: RestablecerPasswordGateway,
    request: Request,
) -> MensajePublicoRespuesta:
    """Aplica la nueva contraseña usando el token único de recuperación."""
    ip = _obtener_ip_cliente(request)
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
    ip = _obtener_ip_cliente(request)
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
