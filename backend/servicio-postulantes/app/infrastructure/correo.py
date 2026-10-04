"""Envío de correos con MAILJET (https://www.mailjet.com), por su API REST v3.1.

Se usa la API directamente con httpx (que el servicio ya tiene) en vez del SDK de Mailjet:
es una sola llamada y así no se agrega otra dependencia.
    POST https://api.mailjet.com/v3.1/send
    Autenticación "Basic": usuario = MAILJET_API_KEY, contraseña = MAILJET_SECRET_KEY

Las dos claves y el remitente van solo en el archivo .env (que git ignora). El remitente
(CORREO_REMITENTE_EMAIL) tiene que estar VALIDADO en Mailjet (Account settings > Sender
addresses & domains); si no, Mailjet no entrega el correo.
"""
import html
import logging
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

_URL_MAILJET = "https://api.mailjet.com/v3.1/send"
_TIEMPO_MAXIMO_SEGUNDOS = 15


async def enviar_correo(destinatario: str, nombre_destinatario: str, asunto: str, html_cuerpo: str, texto: str) -> str:
    """Envía un correo y devuelve el id que le asigna Mailjet. Si algo falla, responde 503."""
    if not (settings.mailjet_api_key and settings.mailjet_secret_key and settings.correo_remitente_email):
        raise ServicioNoDisponible(
            "El envío de correos no está configurado: faltan MAILJET_API_KEY, MAILJET_SECRET_KEY "
            "o CORREO_REMITENTE_EMAIL en el .env del servicio de postulantes"
        )

    mensaje = {
        "From": {"Email": settings.correo_remitente_email, "Name": settings.correo_remitente_nombre},
        "To": [{"Email": destinatario, "Name": nombre_destinatario}],
        "Subject": asunto,
        "HTMLPart": html_cuerpo,
        "TextPart": texto,  # versión sin formato: la leen algunos clientes y ayuda a no caer en spam
    }
    try:
        async with httpx.AsyncClient(timeout=_TIEMPO_MAXIMO_SEGUNDOS) as cliente:
            respuesta = await cliente.post(
                _URL_MAILJET,
                auth=(settings.mailjet_api_key, settings.mailjet_secret_key),
                json={"Messages": [mensaje]},
            )
    except httpx.HTTPError as exc:
        logger.warning("No se pudo conectar con Mailjet: %s", exc)
        raise ServicioNoDisponible("No se pudo enviar el correo. Intenta nuevamente en unos minutos.") from exc

    if respuesta.status_code >= 400:
        # El detalle técnico completo queda en el log; al usuario, el motivo en español.
        logger.warning("Mailjet rechazó el correo (%s): %s", respuesta.status_code, respuesta.text)
        raise ServicioNoDisponible(_motivo_del_rechazo(respuesta))

    resultado = respuesta.json()["Messages"][0]
    if resultado.get("Status") != "success":
        logger.warning("Mailjet no envió el correo: %s", resultado)
        raise ServicioNoDisponible(_motivo_del_rechazo(respuesta))
    return str(resultado["To"][0].get("MessageUUID", ""))


def _motivo_del_rechazo(respuesta: httpx.Response) -> str:
    """Traduce los rechazos más comunes de Mailjet a un mensaje claro para quien usa el ERP."""
    if respuesta.status_code == 401:
        return (
            "Mailjet no aceptó las claves (MAILJET_API_KEY / MAILJET_SECRET_KEY). "
            "Revisa el .env del servicio de postulantes."
        )
    if respuesta.status_code == 429:
        return "Se enviaron demasiados correos seguidos. Espera un momento e intenta de nuevo."

    # Mailjet explica el error dentro de cada mensaje: {"Messages": [{"Errors": [{"ErrorMessage": ...}]}]}
    try:
        errores = respuesta.json()["Messages"][0].get("Errors", [])
        detalle = "; ".join(e.get("ErrorMessage", "") for e in errores if e.get("ErrorMessage"))
    except (ValueError, KeyError, IndexError, TypeError):
        detalle = ""
    if "sender" in detalle.lower():
        return (
            f"El remitente ({settings.correo_remitente_email}) no está validado en Mailjet. "
            "Valídalo en Mailjet > Account settings > Sender addresses & domains."
        )
    if detalle:
        return f"Mailjet rechazó el envío: {detalle}"
    return "El servicio de correo rechazó el envío. Revisa la configuración de Mailjet."


def correo_solicitud_cuenta(nombres: str, email: str) -> tuple[str, str, str]:
    """Arma el correo que invita a un postulante a crear su cuenta en la bolsa de trabajo.

    Devuelve (asunto, html, texto). El enlace lleva el correo ya escrito en el registro.
    """
    enlace = f"{settings.url_anuncios.rstrip('/')}/registro?{urlencode({'email': email})}"
    asunto = "Crea tu cuenta para seguir tu postulación"

    # html.escape: el nombre lo escribió una persona; así no puede "romper" ni inyectar nada en el HTML.
    nombre_html = html.escape(nombres)
    email_html = html.escape(email)
    enlace_html = html.escape(enlace, quote=True)

    html_cuerpo = f"""\
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #4338ca; margin-bottom: 8px;">Hola {nombre_html},</h2>
  <p style="line-height: 1.6;">
    Para que puedas revisar el avance de tus postulaciones, te invitamos a crear tu cuenta
    en nuestra bolsa de trabajo.
  </p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="{enlace_html}"
       style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px;
              text-decoration: none; font-weight: bold; display: inline-block;">
      Crear mi cuenta
    </a>
  </p>
  <p style="line-height: 1.6;">Usa este mismo correo (<strong>{email_html}</strong>) al registrarte.</p>
  <p style="font-size: 12px; color: #64748b; margin-top: 32px;">
    Si el botón no funciona, copia este enlace en tu navegador:<br>
    <a href="{enlace_html}" style="color: #4f46e5;">{html.escape(enlace)}</a>
  </p>
</div>"""

    texto = (
        f"Hola {nombres},\n\n"
        "Para que puedas revisar el avance de tus postulaciones, te invitamos a crear tu cuenta "
        f"en nuestra bolsa de trabajo:\n{enlace}\n\n"
        f"Usa este mismo correo ({email}) al registrarte.\n\nSaludos."
    )
    return asunto, html_cuerpo, texto


def correo_recuperar_password(nombres: str, enlace: str) -> tuple[str, str, str]:
    """Arma el correo para restablecer la contraseña de un postulante.

    Devuelve (asunto, html, texto). Vigencia de 30 minutos.
    """
    asunto = "Restablece tu contraseña - Bolsa de Trabajo"

    nombre_html = html.escape(nombres)
    enlace_html = html.escape(enlace, quote=True)

    html_cuerpo = f"""\
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
  <h2 style="color: #4338ca; margin-bottom: 8px;">Hola {nombre_html},</h2>
  <p style="line-height: 1.6;">
    Recibimos una solicitud para restablecer la contraseña de tu cuenta en nuestra bolsa de trabajo.
  </p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="{enlace_html}"
       style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px;
              text-decoration: none; font-weight: bold; display: inline-block;">
      Restablecer contraseña
    </a>
  </p>
  <p style="line-height: 1.6; font-size: 13px; color: #475569;">
    Este enlace estará vigente durante <strong>30 minutos</strong> y solo puede usarse una vez.
  </p>
  <p style="line-height: 1.6; font-size: 13px; color: #64748b;">
    Si no realizaste esta solicitud, puedes ignorar este correo; tu contraseña permanecerá segura.
  </p>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
    <a href="{enlace_html}" style="color: #4f46e5; word-break: break-all;">{html.escape(enlace)}</a>
  </p>
</div>"""

    texto = (
        f"Hola {nombres},\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta en la bolsa de trabajo.\n\n"
        f"Puedes restablecerla ingresando al siguiente enlace (vigente por 30 minutos):\n{enlace}\n\n"
        "Si tú no solicitaste este cambio, puedes ignorar este mensaje.\n\nSaludos."
    )
    return asunto, html_cuerpo, texto


async def enviar_correo_recuperacion(destinatario: str, nombres: str, raw_token: str) -> None:
    """Envía el correo de recuperación en segundo plano sin bloquear ni propagar excepciones.

    Si Mailjet falla o no está configurado y ENTORNO es desarrollo, imprime el enlace en los logs.
    """
    enlace = f"{settings.url_anuncios.rstrip('/')}/restablecer-password?token={raw_token}"
    asunto, html_cuerpo, texto = correo_recuperar_password(nombres, enlace)

    correo_configurado = bool(settings.mailjet_api_key and settings.mailjet_secret_key and settings.correo_remitente_email)

    if correo_configurado:
        try:
            await enviar_correo(destinatario, nombres, asunto, html_cuerpo, texto)
            logger.info("Correo de recuperación enviado con éxito a la dirección solicitada.")
            return
        except Exception as exc:  # noqa: BLE001
            # Se registra el error SIN revelar el token
            logger.warning("No se pudo entregar el correo de recuperación vía Mailjet: %s", exc)

    # Si no está configurado o falló, y estamos en desarrollo, se muestra en el log para pruebas
    if settings.entorno == "desarrollo":
        logger.info(
            "[DESARROLLO] Enlace de recuperación generado para %s: %s",
            destinatario,
            enlace,
        )
