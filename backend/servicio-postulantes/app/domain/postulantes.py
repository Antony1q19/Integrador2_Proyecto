"""Reglas de negocio de los postulantes.

"Reglas de negocio" = decisiones propias de tu sistema. Están separadas de las
rutas HTTP para que, si una regla cambia, se cambie solo aquí.
"""
from shared_kernel.exceptions import SolicitudInvalida

# --- Versión vigente de términos y política de privacidad (Ley N.º 29733) ---
VERSION_TERMINOS = "2026-01"

# --- Archivos que se pueden subir (mismas reglas que muestra la pantalla) ---
TIPOS_DOCUMENTO = {"CV", "DNI", "CERTIFICADO", "OTRO"}
TIPOS_DE_ARCHIVO_PERMITIDOS = {"application/pdf", "image/jpeg", "image/png"}
TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB


# Roles del ERP que pueden registrar a un postulante a mano (sin que él lo haga
# desde ANUNCIOS). En ese caso el consentimiento queda como "no aceptado" hasta
# que la persona se registre y lo acepte por su cuenta.
ROLES_QUE_REGISTRAN_MANUALMENTE = {"Admin", "RRHH"}


def validar_consentimiento_obligatorio(consentimiento_tratamiento_datos: bool, rol: str) -> None:
    """Si el postulante se registra por su cuenta, debe aceptar el tratamiento de datos.

    Lo exige la ley peruana de protección de datos (Ley N.º 29733). El otro
    consentimiento (recibir comunicaciones comerciales) es opcional y no se
    valida aquí. Cuando quien registra es RRHH o un Admin, no se exige.
    """
    if rol in ROLES_QUE_REGISTRAN_MANUALMENTE:
        return
    if not consentimiento_tratamiento_datos:
        raise SolicitudInvalida(
            "Debes aceptar el tratamiento de datos personales para registrarte"
        )


def validar_archivo(tipo_documento: str, tipo_de_archivo: str | None, tamano_bytes: int) -> None:
    """Comprueba que el archivo se pueda aceptar: tipo de documento conocido,
    formato PDF/JPG/PNG y máximo 5 MB. Si algo falla, lanza error 400."""
    if tipo_documento not in TIPOS_DOCUMENTO:
        raise SolicitudInvalida(f"Tipo de documento inválido: {tipo_documento}")
    if tipo_de_archivo not in TIPOS_DE_ARCHIVO_PERMITIDOS:
        raise SolicitudInvalida("Formato no permitido: solo PDF, JPG o PNG")
    if tamano_bytes == 0:
        raise SolicitudInvalida("El archivo está vacío")
    if tamano_bytes > TAMANO_MAXIMO_BYTES:
        raise SolicitudInvalida("El archivo supera el máximo de 5 MB")
