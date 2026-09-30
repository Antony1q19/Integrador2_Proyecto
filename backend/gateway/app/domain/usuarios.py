"""Reglas de negocio de los trabajadores del ERP.

"Reglas de negocio" = las decisiones propias de tu sistema (qué roles existen,
cuál es la contraseña por defecto...). Están separadas de las rutas HTTP para
que si una regla cambia, se cambie aquí y en ningún otro sitio.
"""
from shared_kernel.exceptions import SolicitudInvalida

# Los únicos roles que puede tener un trabajador del ERP.
# ("Postulante" también existe, pero se crea aparte desde /auth/registro.)
ROLES_INTERNOS_ERP = {"Admin", "RRHH", "Supervisor"}

# Los tres estados posibles de una cuenta.
ESTADOS_VALIDOS = {"Activo", "Suspendido", "Eliminado"}

# Contraseña con la que se crea a un trabajador nuevo o se le restablece la clave.
PASSWORD_POR_DEFECTO = "123456"


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
