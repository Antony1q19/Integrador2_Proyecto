"""Reglas de negocio de los postulantes.

"Reglas de negocio" = decisiones propias de tu sistema. Están separadas de las
rutas HTTP para que, si una regla cambia, se cambie solo aquí.
"""
import re

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


# Los primeros bytes ("firma" o "número mágico") con los que empieza de verdad cada formato. El tipo
# que manda el navegador (Content-Type) lo puede inventar cualquiera; el contenido, no.
_FIRMAS_DE_ARCHIVO = {
    "application/pdf": (b"%PDF-",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
}


def validar_archivo(tipo_documento: str, tipo_de_archivo: str | None, contenido: bytes) -> None:
    """Comprueba que el archivo se pueda aceptar: tipo de documento conocido, formato PDF/JPG/PNG
    (según lo declarado Y según su contenido real) y máximo 5 MB. Si algo falla, lanza error 400."""
    if tipo_documento not in TIPOS_DOCUMENTO:
        raise SolicitudInvalida(f"Tipo de documento inválido: {tipo_documento}")
    if tipo_de_archivo not in TIPOS_DE_ARCHIVO_PERMITIDOS:
        raise SolicitudInvalida("Formato no permitido: solo PDF, JPG o PNG")
    if len(contenido) == 0:
        raise SolicitudInvalida("El archivo está vacío")
    if len(contenido) > TAMANO_MAXIMO_BYTES:
        raise SolicitudInvalida("El archivo supera el máximo de 5 MB")
    if not contenido.startswith(_FIRMAS_DE_ARCHIVO[tipo_de_archivo]):
        raise SolicitudInvalida("El contenido del archivo no corresponde a un PDF, JPG o PNG válido")


# --- Documento de identidad y teléfono ---------------------------------------------------------
TIPOS_DOCUMENTO_IDENTIDAD = {"DNI", "CE", "PASAPORTE"}
_FORMATO_DOCUMENTO = {
    "DNI": (re.compile(r"\d{8}"), "El DNI debe tener exactamente 8 dígitos"),
    "CE": (re.compile(r"[A-Za-z0-9]{8,12}"), "El carné de extranjería debe tener entre 8 y 12 letras o números"),
    "PASAPORTE": (re.compile(r"[A-Za-z0-9]{6,12}"), "El pasaporte debe tener entre 6 y 12 letras o números"),
}
_FORMATO_TELEFONO = re.compile(r"\+?[0-9 ()-]{6,20}")


def validar_documento(tipo: str, numero: str) -> None:
    """DNI = 8 dígitos; carné de extranjería = 8 a 12; pasaporte = 6 a 12 letras o números."""
    if tipo not in TIPOS_DOCUMENTO_IDENTIDAD:
        raise SolicitudInvalida("Tipo de documento inválido: usa DNI, CE o PASAPORTE")
    patron, mensaje = _FORMATO_DOCUMENTO[tipo]
    if not patron.fullmatch(numero.strip()):
        raise SolicitudInvalida(mensaje)


def validar_telefono(telefono: str | None) -> None:
    """Opcional; si viene: solo números (y +, espacios, guiones, paréntesis), con 6 a 15 dígitos."""
    if not telefono:
        return
    digitos = re.sub(r"\D", "", telefono)
    if not _FORMATO_TELEFONO.fullmatch(telefono.strip()) or not 6 <= len(digitos) <= 15:
        raise SolicitudInvalida("El teléfono solo puede tener números (de 6 a 15 dígitos), +, espacios o guiones")


# --- Listas libres del perfil (formación, idiomas, experiencia) ---------------------------------
# El ERP y ANUNCIOS las guardan con formatos algo distintos, así que no se fija un único formato;
# pero sí se acota su TAMAÑO para que nadie guarde megas de basura o estructuras anidadas.
_MAXIMO_ELEMENTOS = 20
_MAXIMO_CAMPOS = 12
_MAXIMO_LARGO_CLAVE = 40
_MAXIMO_LARGO_TEXTO = 500


def validar_lista_libre(nombre: str, elementos: list | None) -> None:
    if elementos is None:
        return
    if len(elementos) > _MAXIMO_ELEMENTOS:
        raise SolicitudInvalida(f"{nombre}: máximo {_MAXIMO_ELEMENTOS} elementos")
    for elemento in elementos:
        if not isinstance(elemento, dict) or len(elemento) > _MAXIMO_CAMPOS:
            raise SolicitudInvalida(f"{nombre}: cada elemento debe ser un objeto con hasta {_MAXIMO_CAMPOS} campos")
        for clave, valor in elemento.items():
            if not isinstance(clave, str) or len(clave) > _MAXIMO_LARGO_CLAVE:
                raise SolicitudInvalida(f"{nombre}: nombre de campo inválido")
            if isinstance(valor, str):
                if len(valor) > _MAXIMO_LARGO_TEXTO:
                    raise SolicitudInvalida(f"{nombre}: el texto de '{clave}' supera {_MAXIMO_LARGO_TEXTO} caracteres")
            elif valor is not None and not isinstance(valor, (bool, int, float)):
                raise SolicitudInvalida(f"{nombre}: el campo '{clave}' tiene un valor no permitido")
