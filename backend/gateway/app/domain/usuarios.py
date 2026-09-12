"""Reglas de negocio de usuarios internos del ERP (Admin/RRHH/Supervisor).

Separado de `api/v1/usuarios.py` por el mismo motivo que en
servicio-postulantes: que la regla de negocio no dependa de FastAPI ni de
la sesión de base de datos concreta.
"""
from shared_kernel.exceptions import SolicitudInvalida

ROLES_INTERNOS_ERP = {"Admin", "RRHH", "Supervisor"}
ESTADOS_VALIDOS = {"Activo", "Suspendido", "Eliminado"}
PASSWORD_POR_DEFECTO = "123456"


def validar_rol_interno(rol: str) -> None:
    """Este módulo solo crea/edita personal interno del ERP -"Postulante"
    se crea aparte, vía /auth/registro (ver ADR de login de ANUNCIOS)."""
    if rol not in ROLES_INTERNOS_ERP:
        raise SolicitudInvalida(f"Rol inválido para un usuario interno: {rol}")


def validar_estado(estado: str) -> None:
    if estado not in ESTADOS_VALIDOS:
        raise SolicitudInvalida(f"Estado inválido: {estado}")


def puede_ver_empresa(rol: str, empresas_visibles: list, empresa_id: int) -> bool:
    """Un Admin ve todas las empresas sin importar `empresas_visibles`
    (esa lista ni siquiera se le exige/edita para un Admin). RRHH/Supervisor
    solo ven las que tengan explícitamente asignadas."""
    if rol == "Admin":
        return True
    return empresa_id in empresas_visibles
