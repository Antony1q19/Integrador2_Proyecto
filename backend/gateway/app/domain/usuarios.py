"""Reglas de negocio de los trabajadores del ERP.

"Reglas de negocio" = las decisiones propias de tu sistema (qué roles existen,
cómo se genera la contraseña temporal...). Están separadas de las rutas HTTP para
que si una regla cambia, se cambie aquí y en ningún otro sitio.
"""
import secrets

from shared_kernel.exceptions import SolicitudInvalida

# Los únicos roles que puede tener un trabajador del ERP (y los únicos que pueden entrar al ERP).
# Los postulantes NO viven en esta tabla: tendrán su propio login en servicio-postulantes.
ROLES_INTERNOS_ERP = {"Admin", "RRHH", "Supervisor"}

# Los tres estados posibles de una cuenta.
ESTADOS_VALIDOS = {"Activo", "Suspendido", "Eliminado"}

# Largo de la contraseña temporal que se genera al crear un trabajador o restablecer su clave.
LARGO_PASSWORD_TEMPORAL = 12
# Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/l/I).
_LETRAS_MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
_LETRAS_MINUSCULAS = "abcdefghijkmnopqrstuvwxyz"
_DIGITOS = "23456789"


def generar_password_temporal() -> str:
    """Genera una contraseña temporal ALEATORIA (antes era siempre "123456", que cualquiera podía adivinar).

    Usa `secrets` (generador criptográfico, no `random`) y siempre incluye al menos una
    mayúscula, una minúscula y un número, para cumplir la política de contraseñas.
    """
    alfabeto = _LETRAS_MAYUSCULAS + _LETRAS_MINUSCULAS + _DIGITOS
    obligatorios = [
        secrets.choice(_LETRAS_MAYUSCULAS),
        secrets.choice(_LETRAS_MINUSCULAS),
        secrets.choice(_DIGITOS),
    ]
    resto = [secrets.choice(alfabeto) for _ in range(LARGO_PASSWORD_TEMPORAL - len(obligatorios))]
    caracteres = obligatorios + resto
    secrets.SystemRandom().shuffle(caracteres)
    return "".join(caracteres)


def validar_rol_interno(rol: str) -> None:
    """Lanza error 400 si el rol no es Admin, RRHH ni Supervisor."""
    if rol not in ROLES_INTERNOS_ERP:
        raise SolicitudInvalida(f"Rol inválido para un usuario interno: {rol}")


def validar_estado(estado: str) -> None:
    """Lanza error 400 si el estado no es Activo, Suspendido ni Eliminado."""
    if estado not in ESTADOS_VALIDOS:
        raise SolicitudInvalida(f"Estado inválido: {estado}")


def puede_ver_empresa(rol: str, empresas_visibles: list, empresa_id: int) -> bool:
    """¿Este usuario puede ver esa empresa?  (regla de referencia)

    - Un Admin ve TODAS las empresas.
    - Los demás roles solo ven las que un Admin les asignó.

    Hoy esta función no se llama desde el backend: como las empresas todavía
    son datos de prueba del frontend, el filtro real lo aplica el ERP en
    app/(dashboard)/empresas/page.tsx con esta misma regla. Se deja aquí para
    cuando exista el microservicio de empresas.
    """
    if rol == "Admin":
        return True
    return empresa_id in empresas_visibles
