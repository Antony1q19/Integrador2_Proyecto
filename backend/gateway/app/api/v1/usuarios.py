"""Gestión de los trabajadores del ERP (pantalla /perfil → "Gestión de Trabajadores").

Rutas (prefijo /usuarios + /api/v1):
    GET    /usuarios                          → listar trabajadores           (Admin)
    POST   /usuarios                          → crear trabajador              (Admin)
    PATCH  /usuarios/{id}                     → editar nombre/rol/empresas    (Admin)
    POST   /usuarios/{id}/restablecer-password→ nueva clave temporal aleatoria (Admin)
    PATCH  /usuarios/{id}/estado              → Activo / Suspendido / Eliminado (Admin)
    PATCH  /usuarios/me/password              → cambiar MI PROPIA contraseña  (cualquier usuario)

Todo es solo para Admin, salvo "cambiar mi propia contraseña".
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_con_cambio_pendiente, requerir_rol
from app.core import cache_cuentas
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.core.security import hash_password, validar_politica_password, verificar_password
from app.domain.usuarios import (
    ROLES_INTERNOS_ERP,
    generar_password_temporal,
    validar_estado,
    validar_rol_interno,
)
from app.infrastructure.models import Usuario
from app.schemas.usuario import (
    CambiarEstadoRequest,
    CambiarPasswordPropio,
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioCreadoRespuesta,
    UsuarioRespuesta,
)
from shared_kernel.exceptions import RecursoNoEncontrado, SolicitudInvalida

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


# ---------------------------------------------------------------------------
# Funciones de ayuda (uso interno de este archivo)
# ---------------------------------------------------------------------------
async def _obtener_o_404(sesion: AsyncSession, usuario_id: str) -> Usuario:
    """Busca un TRABAJADOR por id; si no existe, responde 404.

    Si en la tabla quedara alguna cuenta que no es de trabajador (ej. "Postulante", de cuando el
    registro público escribía aquí), para esta pantalla "no existe": así un Admin no puede
    editarla, suspenderla ni convertirla en RRHH/Supervisor/Admin por error."""
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None or usuario.rol not in ROLES_INTERNOS_ERP:
        raise RecursoNoEncontrado(f"Usuario {usuario_id} no encontrado")
    return usuario


def _con_password_temporal(usuario: Usuario, password_temporal: str) -> UsuarioCreadoRespuesta:
    """Respuesta que incluye la contraseña temporal (aleatoria), para que el Admin
    pueda comunicársela al trabajador. Solo se usa al crear o al restablecer: es la
    ÚNICA vez que se muestra (en la base de datos solo queda su hash)."""
    return UsuarioCreadoRespuesta(
        **UsuarioRespuesta.model_validate(usuario).model_dump(),
        passwordTemporal=password_temporal,
    )


# ---------------------------------------------------------------------------
# Listar y crear
# ---------------------------------------------------------------------------
@router.get("", response_model=list[UsuarioRespuesta])
async def listar_usuarios(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol("Admin")),  # solo un Admin puede entrar
) -> list[UsuarioRespuesta]:
    # Solo trabajadores del ERP (si quedara alguna cuenta antigua de Postulante, se ignora).
    # Los "Eliminados" tampoco se muestran. No se borran de la base de datos
    # (para conservar su historial); simplemente se ocultan aquí.
    resultado = await sesion.execute(
        select(Usuario).where(Usuario.estado != "Eliminado", Usuario.rol.in_(ROLES_INTERNOS_ERP))
    )
    return list(resultado.scalars().all())


@router.post("", response_model=UsuarioCreadoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    datos: UsuarioCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    # PASO 1: el rol debe ser uno del ERP (Admin, RRHH o Supervisor).
    validar_rol_interno(datos.rol)

    # PASO 2: el correo no debe estar ya usado en esta tabla (ni siquiera por una cuenta
    # antigua de Postulante: un mismo correo no puede ser a la vez postulante y trabajador).
    busqueda = await sesion.execute(select(Usuario).where(func.lower(Usuario.email) == datos.email))
    existente = busqueda.scalar_one_or_none()
    if existente is not None:
        detalle = (
            "Ese correo pertenece a una cuenta de postulante; usa otro correo para el trabajador"
            if existente.rol not in ROLES_INTERNOS_ERP
            else "El correo ya está registrado"
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detalle)

    # PASO 3: crear al trabajador con una contraseña temporal aleatoria.
    password_temporal = generar_password_temporal()
    nuevo = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(password_temporal),
        debe_cambiar_password=True,  # en su primer ingreso tendrá que cambiarla
        rol=datos.rol,
        empresas_visibles=datos.empresasVisibles,
    )
    sesion.add(nuevo)
    await sesion.commit()
    await sesion.refresh(nuevo)
    return _con_password_temporal(nuevo, password_temporal)


# ---------------------------------------------------------------------------
# Cambiar MI PROPIA contraseña (cualquier trabajador con sesión)
# ---------------------------------------------------------------------------
# Se declara antes que las rutas con "{usuario_id}" para que quede claro que
# "me" es una palabra fija y no un id.
@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def cambiar_mi_password(
    datos: CambiarPasswordPropio,
    sesion: AsyncSession = Depends(obtener_sesion),
    # Cualquier rol del ERP, incluso quien todavía tiene la contraseña temporal (es justo la ruta
    # que necesita para dejar de tenerla).
    usuario_actual: dict = Depends(obtener_usuario_con_cambio_pendiente),
) -> None:
    # "sub" es el id del usuario, tomado de su token (no de lo que envíe).
    usuario = await _obtener_o_404(sesion, usuario_actual["sub"])

    # Se exige la contraseña actual: así, si alguien deja la sesión abierta,
    # otra persona no puede cambiarla sin conocerla.
    if not verificar_password(datos.passwordActual, usuario.password_hash):
        raise SolicitudInvalida("La contraseña actual no es correcta")

    # La nueva debe cumplir la misma política que la de los postulantes (8+ caracteres, mayúscula,
    # minúscula, número, no ser común ni igual al correo) y ser distinta de la actual.
    es_valida, motivo = validar_politica_password(datos.passwordNuevo, usuario.email)
    if not es_valida:
        raise SolicitudInvalida(motivo or "La contraseña no cumple la política de seguridad")
    if datos.passwordNuevo == datos.passwordActual:
        raise SolicitudInvalida("La nueva contraseña debe ser distinta de la actual")

    usuario.password_hash = hash_password(datos.passwordNuevo)
    usuario.debe_cambiar_password = False
    # Las sesiones abiertas (en este u otro equipo) dejan de valer: hay que entrar con la clave nueva.
    usuario.password_cambiada_en = datetime.now(timezone.utc)
    await sesion.commit()
    cache_cuentas.olvidar(f"erp:{usuario.id}")


# ---------------------------------------------------------------------------
# Editar, restablecer contraseña y cambiar estado (solo Admin)
# ---------------------------------------------------------------------------
@router.patch("/{usuario_id}", response_model=UsuarioRespuesta)
async def actualizar_usuario(
    usuario_id: str,
    datos: UsuarioActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioRespuesta:
    usuario = await _obtener_o_404(sesion, usuario_id)

    # exclude_unset=True → solo trae los campos que realmente se enviaron,
    # así lo que no se envía queda como estaba.
    cambios = datos.model_dump(exclude_unset=True)

    if "rol" in cambios:
        validar_rol_interno(cambios["rol"])
        usuario.rol = cambios["rol"]
    if "nombre" in cambios:
        usuario.nombre = cambios["nombre"]
    if "empresasVisibles" in cambios:
        usuario.empresas_visibles = cambios["empresasVisibles"]

    await sesion.commit()
    cache_cuentas.olvidar(f"erp:{usuario_id}")  # sus empresas o su rol pudieron cambiar: que valga al instante
    await sesion.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/restablecer-password", response_model=UsuarioCreadoRespuesta)
async def restablecer_password(
    usuario_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    """Le asigna a ese trabajador una nueva contraseña temporal aleatoria (por si olvidó la suya)."""
    usuario = await _obtener_o_404(sesion, usuario_id)
    password_temporal = generar_password_temporal()
    usuario.password_hash = hash_password(password_temporal)
    usuario.debe_cambiar_password = True  # al volver a entrar tendrá que cambiarla
    usuario.password_cambiada_en = datetime.now(timezone.utc)  # cierra las sesiones que tuviera abiertas
    await sesion.commit()
    cache_cuentas.olvidar(f"erp:{usuario_id}")
    await sesion.refresh(usuario)
    return _con_password_temporal(usuario, password_temporal)


@router.patch("/{usuario_id}/estado", response_model=UsuarioRespuesta)
async def cambiar_estado(
    usuario_id: str,
    datos: CambiarEstadoRequest,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario_actual: dict = Depends(requerir_rol("Admin")),
) -> UsuarioRespuesta:
    """Cambia el estado: Activo, Suspendido o Eliminado."""
    # Un Admin no puede suspenderse ni eliminarse a sí mismo: podría quedarse
    # sin acceso y sin nadie que lo revierta.
    if usuario_id == usuario_actual["sub"] and datos.estado != "Activo":
        raise SolicitudInvalida("No puedes cambiar el estado de tu propia cuenta")

    validar_estado(datos.estado)
    usuario = await _obtener_o_404(sesion, usuario_id)
    usuario.estado = datos.estado
    await sesion.commit()
    cache_cuentas.olvidar(f"erp:{usuario_id}")  # una cuenta suspendida o eliminada pierde el acceso al instante
    await sesion.refresh(usuario)
    return usuario
