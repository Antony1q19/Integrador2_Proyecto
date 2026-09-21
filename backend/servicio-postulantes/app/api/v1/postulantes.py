"""Rutas de postulantes: listar, ver uno, crear y editar.

Rutas (prefijo /postulantes). El navegador las llama a través del Gateway,
como /api/v1/postulantes...:
    GET    /postulantes         → listar todos      (Admin, RRHH, Supervisor)
    GET    /postulantes/{id}    → ver uno           (cualquier usuario con sesión)
    POST   /postulantes         → crear             (ANUNCIOS al registrarse, o RRHH a mano; 409 si el documento o el correo ya existen)
    PATCH  /postulantes/{id}    → editar            (Admin, RRHH, Supervisor)

Estas funciones son "delgadas" a propósito: reciben la petición, aplican la
regla de negocio (domain/postulantes.py) y guardan/leen en la base de datos.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual, requerir_rol
from app.api.visibilidad import exigir_postulante_visible, postulantes_ocultos
from app.core.database import obtener_sesion
from app.domain.postulantes import validar_consentimiento_obligatorio
from app.infrastructure.models import Postulante, Usuario
from app.schemas.postulante import PostulanteActualizar, PostulanteCrear, PostulanteRespuesta
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado

router = APIRouter(prefix="/postulantes", tags=["postulantes"])


# ---------------------------------------------------------------------------
# Funciones de ayuda (uso interno de este archivo)
# ---------------------------------------------------------------------------
def _a_respuesta(p: Postulante, tiene_cuenta: bool = False) -> PostulanteRespuesta:
    """Convierte una fila de la base de datos (nombres_con_guion_bajo) al formato
    JSON que espera el frontend (nombresEnCamelCase)."""
    return PostulanteRespuesta(
        tieneCuenta=tiene_cuenta,
        id=p.id,
        nombres=p.nombres,
        apellidos=p.apellidos,
        documentoTipo=p.documento_tipo,
        documentoNumero=p.documento_numero,
        email=p.email,
        telefono=p.telefono,
        cargoPostulado=p.cargo_postulado,
        empresaCliente=p.empresa_cliente,
        fechaNacimiento=p.fecha_nacimiento,
        direccion=p.direccion,
        fuenteReclutamiento=p.fuente_reclutamiento,
        formacionAcademica=p.formacion_academica,
        idiomas=p.idiomas,
        experiencia=p.experiencia,
        fechaRegistro=p.fecha_registro,
        consentimientoTratamientoDatos=p.consentimiento_tratamiento_datos,
        consentimientoComunicacionesComerciales=p.consentimiento_comunicaciones_comerciales,
    )


async def _obtener_o_404(sesion: AsyncSession, postulante_id: str) -> Postulante:
    """Busca un postulante por id; si no existe, responde 404."""
    postulante = await sesion.get(Postulante, postulante_id)
    if postulante is None:
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")
    return postulante


async def _ids_con_cuenta(sesion: AsyncSession, postulante_id: str | None = None) -> set[str]:
    """Ids de los postulantes que ya tienen una cuenta activa en la tabla `usuarios`
    (si se indica un id, solo se revisa ese). Una cuenta "Eliminada" no cuenta."""
    consulta = select(Usuario.postulante_id).where(Usuario.estado != "Eliminado")
    if postulante_id:
        consulta = consulta.where(Usuario.postulante_id == postulante_id)
    return set((await sesion.execute(consulta)).scalars().all())


# ---------------------------------------------------------------------------
# Listar y ver uno
# ---------------------------------------------------------------------------
@router.get("", response_model=list[PostulanteRespuesta])
async def listar_postulantes(
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),  # un Postulante NO puede ver a los demás
) -> list[PostulanteRespuesta]:
    resultado = await sesion.execute(select(Postulante))  # equivale a: SELECT * FROM postulantes
    con_cuenta = await _ids_con_cuenta(sesion)
    ocultos = await postulantes_ocultos(usuario)  # los de empresas que este usuario no tiene asignadas
    return [_a_respuesta(p, p.id in con_cuenta) for p in resultado.scalars().all() if p.id not in ocultos]


@router.get("/{postulante_id}", response_model=PostulanteRespuesta, dependencies=[Depends(exigir_postulante_visible)])
async def obtener_postulante(
    postulante_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(obtener_usuario_actual),
) -> PostulanteRespuesta:
    postulante = await _obtener_o_404(sesion, postulante_id)
    return _a_respuesta(postulante, postulante_id in await _ids_con_cuenta(sesion, postulante_id))


# ---------------------------------------------------------------------------
# Crear
# ---------------------------------------------------------------------------
@router.post("", response_model=PostulanteRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_postulante(
    datos: PostulanteCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(obtener_usuario_actual),
) -> PostulanteRespuesta:
    # Esta ruta no limita el rol: la usa la app ANUNCIOS cuando una persona se registra
    # por su cuenta, y el ERP cuando RRHH registra a alguien a mano (siempre a través
    # del Gateway).

    # PASO 1: si se registra por su cuenta, debe aceptar el tratamiento de datos
    # (RRHH y Admin pueden registrarlo sin ese consentimiento, ver domain/postulantes.py).
    validar_consentimiento_obligatorio(datos.consentimientos.tratamientoDatos, usuario["rol"])

    # PASO 1b: no puede haber dos postulantes con el mismo documento ni el mismo correo.
    mismo_documento = select(Postulante.id).where(Postulante.documento_numero == datos.documentoNumero)
    if (await sesion.execute(mismo_documento)).first():
        raise ConflictoDeEstado("Ya existe un postulante con ese número de documento")
    mismo_correo = select(Postulante.id).where(Postulante.email == datos.email)
    if (await sesion.execute(mismo_correo)).first():
        raise ConflictoDeEstado("Ya existe un postulante con ese correo")

    # PASO 2: armar el registro (traduciendo de camelCase a nombres de columna).
    postulante = Postulante(
        nombres=datos.nombres,
        apellidos=datos.apellidos,
        documento_tipo=datos.documentoTipo,
        documento_numero=datos.documentoNumero,
        email=datos.email,
        telefono=datos.telefono,
        cargo_postulado=datos.cargoPostulado,
        empresa_cliente=datos.empresaCliente,
        fecha_nacimiento=datos.fechaNacimiento,
        direccion=datos.direccion,
        fuente_reclutamiento=datos.fuenteReclutamiento,
        formacion_academica=[i.model_dump() for i in datos.formacionAcademica],
        idiomas=[i.model_dump() for i in datos.idiomas],
        experiencia=[i.model_dump() for i in datos.experiencia],
        consentimiento_tratamiento_datos=datos.consentimientos.tratamientoDatos,
        consentimiento_comunicaciones_comerciales=datos.consentimientos.comunicacionesComerciales,
        # La fecha de aceptación solo existe si de verdad aceptó.
        fecha_aceptacion_consentimiento=(
            datetime.now(timezone.utc) if datos.consentimientos.tratamientoDatos else None
        ),
    )

    # PASO 3: guardarlo en la base de datos.
    sesion.add(postulante)
    await sesion.commit()          # "commit" = confirmar y guardar de verdad
    await sesion.refresh(postulante)  # vuelve a leerlo (trae id y fecha generados)
    return _a_respuesta(postulante)


# ---------------------------------------------------------------------------
# Editar
# ---------------------------------------------------------------------------
@router.patch("/{postulante_id}", response_model=PostulanteRespuesta, dependencies=[Depends(exigir_postulante_visible)])
async def actualizar_postulante(
    postulante_id: str,
    datos: PostulanteActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> PostulanteRespuesta:
    postulante = await _obtener_o_404(sesion, postulante_id)

    # Solo los campos que realmente se enviaron (lo demás queda como estaba).
    cambios = datos.model_dump(exclude_unset=True)

    # Nombre del campo en el JSON (camelCase) → nombre de la columna en la base.
    # Los campos que no aparecen aquí (nombres, apellidos, telefono) se llaman igual en ambos.
    nombre_de_columna = {
        "cargoPostulado": "cargo_postulado",
        "empresaCliente": "empresa_cliente",
        "formacionAcademica": "formacion_academica",
        "fechaNacimiento": "fecha_nacimiento",
        "fuenteReclutamiento": "fuente_reclutamiento",
    }
    for campo, valor in cambios.items():
        setattr(postulante, nombre_de_columna.get(campo, campo), valor)

    await sesion.commit()
    await sesion.refresh(postulante)
    return _a_respuesta(postulante, postulante_id in await _ids_con_cuenta(sesion, postulante_id))
