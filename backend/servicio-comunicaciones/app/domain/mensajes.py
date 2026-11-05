"""Reglas de negocio de las conversaciones."""
from shared_kernel.exceptions import SolicitudInvalida
from shared_kernel.telefonos import normalizar_telefono as _normalizar


def normalizar_telefono(telefono: str) -> str:
    """Deja el teléfono solo con dígitos y con código de país (+51 si no trae uno).

    Ej: "947757081" → "51947757081";  "+51 987 654 321" → "51987654321"
    """
    limpio = _normalizar(telefono)
    if not limpio:
        raise SolicitudInvalida("El teléfono es obligatorio")
    return limpio


def validar_texto(texto: str) -> None:
    """Valida que el texto del mensaje no esté vacío y no sea demasiado largo."""
    if not texto or not texto.strip():
        raise SolicitudInvalida("El mensaje no puede estar vacío")
    if len(texto) > 4000:
        raise SolicitudInvalida("El mensaje es demasiado largo (máx 4000 caracteres)")


def ocultar_telefono(telefono: str) -> str:
    """Para los logs: "51947757081" → "51*****7081" (los logs no deben guardar datos personales)."""
    digitos = "".join(c for c in (telefono or "") if c.isdigit())
    if len(digitos) <= 6:
        return "***"
    return f"{digitos[:2]}{'*' * (len(digitos) - 6)}{digitos[-4:]}"


# Los errores de entrega más comunes de WhatsApp, explicados para quien usa el ERP.
_MOTIVOS = {
    131047: "Pasaron más de 24 horas desde el último mensaje del postulante: usa \"Retomar chat\".",
    131026: "El número no tiene WhatsApp o no puede recibir mensajes.",
    131030: "El número no está en la lista de destinatarios permitidos de la cuenta de prueba.",
    131049: "WhatsApp no entregó el mensaje para cuidar la experiencia del usuario. Intenta más tarde.",
    131050: "El postulante pidió no recibir mensajes de este número.",
    130429: "Se enviaron demasiados mensajes seguidos. Espera un momento.",
}


def motivo_del_fallo(errores: list[dict]) -> str:
    """Convierte el error que manda Meta en una explicación corta en español (máx. 300 caracteres)."""
    if not errores:
        return "WhatsApp no pudo entregar el mensaje."
    error = errores[0]
    motivo = _MOTIVOS.get(error.get("code")) or error.get("title") or error.get("message")
    return (motivo or "WhatsApp no pudo entregar el mensaje.")[:300]
