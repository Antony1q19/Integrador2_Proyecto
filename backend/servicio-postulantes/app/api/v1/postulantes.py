"""Endpoints de postulantes. Capa fina: valida con Pydantic, delega la
regla de negocio a `app.domain.postulantes` y persiste con SQLAlchemy."""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual, requerir_rol
from app.core.database import obtener_sesion
from app.domain.postulantes import validar_consentimiento_obligatorio
from app.infrastructure.models import Postulante
from app.schemas.postulante import PostulanteActualizar, PostulanteCrear, PostulanteRespuesta
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/postulantes", tags=["postulantes"])


def _a_respuesta(p: Postulante) -> PostulanteRespuesta:
    return PostulanteRespuesta(
        id=p.id,
        nombres=p.nombres,
        apellidos=p.apellidos,
        documentoTipo=p.documento_tipo,
        documentoNumero=p.documento_numero,
        email=p.email,
        telefono=p.telefono,
        cargoPostulado=p.cargo_postulado,
        empresaCliente=p.empresa_cliente,
        formacionAcademica=p.formacion_academica,
        idiomas=p.idiomas,
        experiencia=p.experiencia,
        fechaRegistro=p.fecha_registro,
        consentimientoTratamientoDatos=p.consentimiento_tratamiento_datos,
        consentimientoComunicacionesComerciales=p.consentimiento_comunicaciones_comerciales,
    )


async def _obtener_o_404(sesion: AsyncSession, postulante_id: str) -> Postulante:
    postulante = await sesion.get(Postulante, postulante_id)
    if postulante is None:
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")
    return postulante


@router.get("", response_model=list[PostulanteRespuesta])
async def listar_postulantes(
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[PostulanteRespuesta]:
    resultado = await sesion.execute(select(Postulante))
    return [_a_respuesta(p) for p in resultado.scalars().all()]


@router.get("/{postulante_id}", response_model=PostulanteRespuesta)
async def obtener_postulante(
    postulante_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(obtener_usuario_actual),
) -> PostulanteRespuesta:
    return _a_respuesta(await _obtener_o_404(sesion, postulante_id))


@router.post("", response_model=PostulanteRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_postulante(
    datos: PostulanteCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> PostulanteRespuesta:
    # Sin `requerir_rol`: lo llama el auto-registro público desde ANUNCIOS
    # (a través del Gateway), no requiere ser un usuario interno del ERP.
    validar_consentimiento_obligatorio(datos.consentimientos.tratamientoDatos)

    postulante = Postulante(
        nombres=datos.nombres,
        apellidos=datos.apellidos,
        documento_tipo=datos.documentoTipo,
        documento_numero=datos.documentoNumero,
        email=datos.email,
        telefono=datos.telefono,
        cargo_postulado=datos.cargoPostulado,
        empresa_cliente=datos.empresaCliente,
        formacion_academica=[i.model_dump() for i in datos.formacionAcademica],
        idiomas=[i.model_dump() for i in datos.idiomas],
        experiencia=[i.model_dump() for i in datos.experiencia],
        consentimiento_tratamiento_datos=datos.consentimientos.tratamientoDatos,
        consentimiento_comunicaciones_comerciales=datos.consentimientos.comunicacionesComerciales,
    )
    sesion.add(postulante)
    await sesion.commit()
    await sesion.refresh(postulante)
    return _a_respuesta(postulante)


@router.patch("/{postulante_id}", response_model=PostulanteRespuesta)
async def actualizar_postulante(
    postulante_id: str,
    datos: PostulanteActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> PostulanteRespuesta:
    postulante = await _obtener_o_404(sesion, postulante_id)
    cambios = datos.model_dump(exclude_unset=True)
    mapa_campos = {
        "cargoPostulado": "cargo_postulado",
        "empresaCliente": "empresa_cliente",
        "formacionAcademica": "formacion_academica",
        "idiomas": "idiomas",
        "experiencia": "experiencia",
    }
    for campo, valor in cambios.items():
        columna = mapa_campos.get(campo, campo)
        if columna in ("formacion_academica", "idiomas", "experiencia") and valor is not None:
            valor = [item if isinstance(item, dict) else item.model_dump() for item in valor]
        setattr(postulante, columna, valor)

    await sesion.commit()
    await sesion.refresh(postulante)
    return _a_respuesta(postulante)
