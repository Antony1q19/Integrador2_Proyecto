"""Gestión de los trabajadores del ERP (pantalla /perfil → "Gestión de Trabajadores").

Rutas (prefijo /usuarios + /api/v1):
    GET    /usuarios                          → listar trabajadores           (Admin)
    POST   /usuarios                          → crear trabajador              (Admin)
    PATCH  /usuarios/{id}                     → editar nombre/rol/empresas    (Admin)
    POST   /usuarios/{id}/restablecer-password→ volver la clave a 123456      (Admin)
    PATCH  /usuarios/{id}/estado              → Activo / Suspendido / Eliminado (Admin)
    PATCH  /usuarios/me/password              → cambiar MI PROPIA contraseña  (cualquier usuario)

Todo es solo para Admin, salvo "cambiar mi propia contraseña".
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual, requerir_rol
from app.core import cache_empresas
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.core.security import hash_password, verificar_password
from app.domain.usuarios import (
    PASSWORD_POR_DEFECTO,
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
    """Busca un usuario por id; si no existe, responde 404."""
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise RecursoNoEncontrado(f"Usuario {usuario_id} no encontrado")
    return usuario


def _con_password_temporal(usuario: Usuario) -> UsuarioCreadoRespuesta:
    """Respuesta que incluye la contraseña temporal (123456), para que el Admin
    pueda comunicársela al trabajador. Solo se usa al crear o al restablecer."""
    return UsuarioCreadoRespuesta(
        **UsuarioRespuesta.model_validate(usuario).model_dump(),
        passwordTemporal=PASSWORD_POR_DEFECTO,
    )


# ---------------------------------------------------------------------------
# Listar y crear
# ---------------------------------------------------------------------------
@router.get("", response_model=list[UsuarioRespuesta])
async def listar_usuarios(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol("Admin")),  # solo un Admin puede entrar
) -> list[UsuarioRespuesta]:
    # Los "Eliminados" no se muestran en la lista. No se borran de la base de
    # datos (para conservar su historial); simplemente se ocultan aquí.
    resultado = await sesion.execute(select(Usuario).where(Usuario.estado != "Eliminado"))
    return list(resultado.scalars().all())


@router.post("", response_model=UsuarioCreadoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    datos: UsuarioCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    # PASO 1: el rol debe ser uno del ERP (Admin, RRHH o Supervisor).
    validar_rol_interno(datos.rol)

    # PASO 2: el correo no debe estar ya usado.
    busqueda = await sesion.execute(select(Usuario).where(Usuario.email == datos.email))
    if busqueda.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

    # PASO 3: crear al trabajador con la contraseña por defecto (123456).
    nuevo = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(PASSWORD_POR_DEFECTO),
        rol=datos.rol,
        empresas_visibles=datos.empresasVisibles,
    )
    sesion.add(nuevo)
    await sesion.commit()
    await sesion.refresh(nuevo)
    return _con_password_temporal(nuevo)


# ---------------------------------------------------------------------------
# Cambiar MI PROPIA contraseña (cualquier usuario con sesión)
# ---------------------------------------------------------------------------
# Se declara antes que las rutas con "{usuario_id}" para que quede claro que
# "me" es una palabra fija y no un id.
@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def cambiar_mi_password(
    datos: CambiarPasswordPropio,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario_actual: dict = Depends(obtener_usuario_actual),  # cualquier rol
) -> None:
    # "sub" es el id del usuario, tomado de su token (no de lo que envíe).
    usuario = await _obtener_o_404(sesion, usuario_actual["sub"])

    # Se exige la contraseña actual: así, si alguien deja la sesión abierta,
    # otra persona no puede cambiarla sin conocerla.
    if not verificar_password(datos.passwordActual, usuario.password_hash):
        raise SolicitudInvalida("La contraseña actual no es correcta")

    usuario.password_hash = hash_password(datos.passwordNuevo)
    await sesion.commit()


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
    cache_empresas.olvidar(usuario_id)  # sus empresas o su rol pudieron cambiar: que valga al instante
    await sesion.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/restablecer-password", response_model=UsuarioCreadoRespuesta)
async def restablecer_password(
    usuario_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    """Vuelve la contraseña de ese trabajador a 123456 (por si la olvidó)."""
    usuario = await _obtener_o_404(sesion, usuario_id)
    usuario.password_hash = hash_password(PASSWORD_POR_DEFECTO)
    await sesion.commit()
    await sesion.refresh(usuario)
    return _con_password_temporal(usuario)


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
    cache_empresas.olvidar(usuario_id)  # una cuenta suspendida o eliminada deja de ver empresas al instante
    await sesion.refresh(usuario)
    return usuario
