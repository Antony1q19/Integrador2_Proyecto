"""Reglas de negocio de postulantes, sin depender de FastAPI ni de la
sesión de base de datos concreta -reciben datos ya leídos/a escribir y
deciden si son válidos-. Los endpoints en `api/v1/postulantes.py` son
capa fina que solo traduce HTTP <-> estas funciones."""
from shared_kernel.exceptions import SolicitudInvalida


def validar_consentimiento_obligatorio(consentimiento_tratamiento_datos: bool) -> None:
    """El consentimiento de tratamiento de datos (Ley N.º 29733) es
    obligatorio para crear la cuenta; el de comunicaciones comerciales es
    opcional y no se valida acá."""
    if not consentimiento_tratamiento_datos:
        raise SolicitudInvalida(
            "Debes aceptar el tratamiento de datos personales para registrarte"
        )


def calcular_edad_registro_valida(documento_numero: str) -> bool:
    """Placeholder de una regla real de validación de documento (ej.
    dígito verificador de DNI/RUC). Se deja explícito el punto de
    extensión en vez de validar solo con Pydantic, porque esta regla
    puede cambiar por país/tipo de documento sin tocar el esquema HTTP."""
    return len(documento_numero.strip()) >= 8
