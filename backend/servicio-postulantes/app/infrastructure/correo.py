"""Envío de correos: Amazon SES en AWS, o el log en desarrollo.

CORREO (.env):
  - "ses"     → Amazon SES (API v2, SendEmail). El permiso lo da el rol de IAM de la tarea (sin claves).
                El remitente (CORREO_REMITENTE_EMAIL) debe estar VERIFICADO en SES. Mientras la cuenta
                esté en el "sandbox" de SES, solo se puede enviar a direcciones también verificadas.
  - "consola" → no se envía nada: el correo (con su enlace) se escribe en el log, para probar en la PC.
"""
import asyncio
import html
import logging
import uuid
from urllib.parse import urlencode

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

_cliente_ses = None


def _ses():
    global _cliente_ses
    if _cliente_ses is None:
        import boto3  # solo hace falta en modo "ses"

        _cliente_ses = boto3.client("sesv2", region_name=settings.aws_region)
    return _cliente_ses


async def enviar_correo(destinatario: str, nombre_destinatario: str, asunto: str, html_cuerpo: str, texto: str) -> str:
    """Envía un correo y devuelve el id del mensaje. Si algo falla, responde 503 con el motivo."""
    if settings.correo != "ses":
        logger.info("Correo (modo consola) para %s | %s | %s", destinatario, asunto, texto)
        return f"consola-{uuid.uuid4().hex}"

    if not settings.correo_remitente_email:
        raise ServicioNoDisponible("El envío de correos no está configurado: falta CORREO_REMITENTE_EMAIL")

    remitente = f"{settings.correo_remitente_nombre} <{settings.correo_remitente_email}>"
    try:
        respuesta = await asyncio.to_thread(
            _ses().send_email,
            FromEmailAddress=remitente,
            Destination={"ToAddresses": [destinatario]},
            Content={
                "Simple": {
                    "Subject": {"Data": asunto, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {"Data": html_cuerpo, "Charset": "UTF-8"},
                        # versión sin formato: la leen algunos clientes y ayuda a no caer en spam
                        "Text": {"Data": texto, "Charset": "UTF-8"},
                    },
                }
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("SES no envió el correo: %s", exc)
        raise ServicioNoDisponible(_motivo_del_rechazo(exc)) from exc
    return str(respuesta.get("MessageId", ""))


def _motivo_del_rechazo(error: Exception) -> str:
    """Traduce los rechazos más comunes de SES a un mensaje claro para quien usa el ERP."""
    detalle = str(error)
    if "not verified" in detalle.lower():
        return (
            "SES no permite enviar a esa dirección todavía: la cuenta está en el sandbox de SES y solo "
            "envía a correos verificados. Verifica el destinatario o pide el acceso de producción en SES."
        )
    if "Throttling" in detalle or "MaxSendRate" in detalle:
        return "Se enviaron demasiados correos seguidos. Espera un momento e intenta de nuevo."
    return "No se pudo enviar el correo. Intenta nuevamente en unos minutos."


def correo_solicitud_cuenta(nombres: str, email: str, token_invitacion: str) -> tuple[str, str, str]:
    """Arma el correo que invita a un postulante a crear su cuenta en la bolsa de trabajo.

    Devuelve (asunto, html, texto). El enlace lleva el correo ya escrito en el registro y el token
    de invitación (de un solo uso, 7 días): sin él no se puede crear la cuenta de ese perfil.
    """
    parametros = urlencode({"invitacion": token_invitacion, "email": email})
    enlace = f"{settings.url_anuncios.rstrip('/')}/registro?{parametros}"
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
  <p style="line-height: 1.6;">Usa este mismo correo (<strong>{email_html}</strong>) al registrarte.
    El enlace es personal, vale por 7 días y solo puede usarse una vez.</p>
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

    En desarrollo (o si el envío falla) el enlace queda en el log para poder probar el flujo.
    """
    enlace = f"{settings.url_anuncios.rstrip('/')}/restablecer-password?token={raw_token}"
    asunto, html_cuerpo, texto = correo_recuperar_password(nombres, enlace)

    if settings.correo == "ses":
        try:
            await enviar_correo(destinatario, nombres, asunto, html_cuerpo, texto)
            logger.info("Correo de recuperación enviado con éxito a la dirección solicitada.")
            return
        except Exception as exc:  # noqa: BLE001
            # Se registra el error SIN revelar el token
            logger.warning("No se pudo entregar el correo de recuperación vía SES: %s", exc)

    # Si no está configurado o falló, y estamos en desarrollo, se muestra en el log para pruebas
    if settings.entorno == "desarrollo":
        logger.info(
            "[DESARROLLO] Enlace de recuperación generado para %s: %s",
            destinatario,
            enlace,
        )
