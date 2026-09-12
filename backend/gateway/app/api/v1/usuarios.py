"""Endpoints de gestión de usuarios internos del ERP.

Todo bajo `requerir_rol("Admin")` salvo el cambio de la propia contraseña
(`/usuarios/me/password`), al que puede llamar cualquier usuario
autenticado -es la única acción de este archivo que no es exclusiva del
Admin, ver la historia de usuario: "cada usuario pueda cambiar su propia
contraseña"-.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual, requerir_rol
from app.core.database import obtener_sesion
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


async def _obtener_o_404(sesion: AsyncSession, usuario_id: str) -> Usuario:
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise RecursoNoEncontrado(f"Usuario {usuario_id} no encontrado")
    return usuario


@router.get("", response_model=list[UsuarioRespuesta])
async def listar_usuarios(
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> list[UsuarioRespuesta]:
    # "Eliminado" es soft-delete (la fila sigue existiendo, ver
    # domain/usuarios.py), pero no debe aparecer en la pantalla de
    # "Gestión de Trabajadores" -por eso se filtra acá, no se borra-.
    resultado = await sesion.execute(select(Usuario).where(Usuario.estado != "Eliminado"))
    return list(resultado.scalars().all())


@router.post("", response_model=UsuarioCreadoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    datos: UsuarioCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    validar_rol_interno(datos.rol)

    existente = await sesion.execute(select(Usuario).where(Usuario.email == datos.email))
    if existente.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

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
    return UsuarioCreadoRespuesta(
        **UsuarioRespuesta.model_validate(nuevo).model_dump(),
        passwordTemporal=PASSWORD_POR_DEFECTO,
    )


# IMPORTANTE: esta ruta literal ("/me/password") se declara ANTES que
# "/{usuario_id}" para que FastAPI no confunda "me" con un id -en este
# caso no hay ambigüedad real porque difieren en cantidad de segmentos,
# pero se deja en este orden por claridad de lectura del archivo-.
@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def cambiar_mi_password(
    datos: CambiarPasswordPropio,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario_actual: dict = Depends(obtener_usuario_actual),
) -> None:
    usuario = await _obtener_o_404(sesion, usuario_actual["sub"])
    if not verificar_password(datos.passwordActual, usuario.password_hash):
        raise SolicitudInvalida("La contraseña actual no es correcta")
    usuario.password_hash = hash_password(datos.passwordNuevo)
    await sesion.commit()


@router.patch("/{usuario_id}", response_model=UsuarioRespuesta)
async def actualizar_usuario(
    usuario_id: str,
    datos: UsuarioActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioRespuesta:
    usuario = await _obtener_o_404(sesion, usuario_id)
    cambios = datos.model_dump(exclude_unset=True)

    if "rol" in cambios:
        validar_rol_interno(cambios["rol"])
        usuario.rol = cambios["rol"]
    if "nombre" in cambios:
        usuario.nombre = cambios["nombre"]
    if "empresasVisibles" in cambios:
        usuario.empresas_visibles = cambios["empresasVisibles"]

    await sesion.commit()
    await sesion.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/restablecer-password", response_model=UsuarioCreadoRespuesta)
async def restablecer_password(
    usuario_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin")),
) -> UsuarioCreadoRespuesta:
    usuario = await _obtener_o_404(sesion, usuario_id)
    usuario.password_hash = hash_password(PASSWORD_POR_DEFECTO)
    await sesion.commit()
    await sesion.refresh(usuario)
    return UsuarioCreadoRespuesta(
        **UsuarioRespuesta.model_validate(usuario).model_dump(),
        passwordTemporal=PASSWORD_POR_DEFECTO,
    )


@router.patch("/{usuario_id}/estado", response_model=UsuarioRespuesta)
async def cambiar_estado(
    usuario_id: str,
    datos: CambiarEstadoRequest,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario_actual: dict = Depends(requerir_rol("Admin")),
) -> UsuarioRespuesta:
    if usuario_id == usuario_actual["sub"] and datos.estado != "Activo":
        # Un Admin no puede suspenderse/eliminarse a sí mismo y quedar
        # bloqueado sin nadie que pueda revertirlo.
        raise SolicitudInvalida("No puedes cambiar el estado de tu propia cuenta")

    validar_estado(datos.estado)
    usuario = await _obtener_o_404(sesion, usuario_id)
    usuario.estado = datos.estado
    await sesion.commit()
    await sesion.refresh(usuario)
    return usuario
