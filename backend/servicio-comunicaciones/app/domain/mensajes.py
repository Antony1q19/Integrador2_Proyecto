"""Reglas de negocio de las conversaciones."""
from shared_kernel.exceptions import SolicitudInvalida


def normalizar_telefono(telefono: str) -> str:
    """Limpia el teléfono para dejarlo solo con dígitos (sin '+' ni espacios).

    Ej: "+51 987 654 321" → "51987654321"
    """
    limpio = "".join(c for c in telefono if c.isdigit())
    if not limpio:
        raise SolicitudInvalida("El teléfono es obligatorio")
    return limpio

def validar_texto(texto: str) -> None:
    """Valida que el texto del mensaje no esté vacío y no sea demasiado largo."""
    if not texto or not texto.strip():
        raise SolicitudInvalida("El mensaje no puede estar vacío")
    if len(texto) > 4000:
        raise SolicitudInvalida("El mensaje es demasiado largo (máx 4000 caracteres)")