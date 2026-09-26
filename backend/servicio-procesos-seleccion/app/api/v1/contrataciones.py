"""Rutas de las contrataciones (cuando una postulación termina en "Contratado").

Rutas (prefijo /contrataciones). El navegador las llama a través del Gateway, como /api/v1/contrataciones...:
    GET    /contrataciones?postulanteId=&anuncioId=&estado=   → listar (cada una con sus seguimientos)
    POST   /contrataciones                                    → registrar la contratación (Admin, RRHH)
    PATCH  /contrataciones/{id}                               → corregir datos o cambiar el estado (Admin, RRHH)

Al registrar una contratación pasan tres cosas juntas (o ninguna): la postulación se marca "Contratado" (con su
línea en el historial), se guarda la contratación y se programan los controles de 30, 60 y 90 días.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from app.api.comunes import USUARIO_POR_DEFECTO, buscar_proceso, contratacion_a_respuesta
from app.api.deps import requerir_rol
from app.api.visibilidad import anuncios_visibles
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.seleccion import (
    ESTADOS_CONTRATACION,
    HITOS_SEGUIMIENTO,
    TIPOS_CONTRATO,
    estado_inicial_de_contratacion,
    exigir_postulacion_abierta,
    fecha_de_seguimiento,
    validar_opcion,
)
from app.infrastructure.models import Contratacion, HistorialEstado, ProcesoPostulacion, SeguimientoPostingreso
from app.schemas.seleccion import ContratacionActualizar, ContratacionCrear, ContratacionRespuesta
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado

router = APIRouter(prefix="/contrataciones", tags=["contrataciones"])


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ContratacionRespuesta])
async def listar_contrataciones(
    postulanteId: str | None = None,
    anuncioId: int | None = None,
    estado: str | None = None,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[ContratacionRespuesta]:
    validar_opcion(estado, ESTADOS_CONTRATACION, "Estado")
    visibles = await anuncios_visibles(usuario)

    # La postulación y los seguimientos vienen en la MISMA consulta (join): un solo viaje a la base de datos.
    consulta = (
        select(Contratacion)
        .join(ProcesoPostulacion, Contratacion.proceso_id == ProcesoPostulacion.id)
        .options(contains_eager(Contratacion.proceso), joinedload(Contratacion.seguimientos))
        .order_by(Contratacion.fecha_ingreso.desc())
    )
    if postulanteId:
        consulta = consulta.where(ProcesoPostulacion.postulante_id == postulanteId)
    if anuncioId is not None:
        consulta = consulta.where(ProcesoPostulacion.anuncio_id == anuncioId)
    if estado:
        consulta = consulta.where(Contratacion.estado == estado)
    if visibles is not None:  # RRHH / Supervisor: solo anuncios de sus empresas
        consulta = consulta.where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))

    resultado = await sesion.execute(consulta)
    return [contratacion_a_respuesta(c) for c in resultado.unique().scalars().all()]


# ---------------------------------------------------------------------------
# Registrar
# ---------------------------------------------------------------------------
@router.post("", response_model=ContratacionRespuesta, status_code=status.HTTP_201_CREATED)
async def registrar_contratacion(
    datos: ContratacionCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> ContratacionRespuesta:
    # PASO 1: datos válidos y anuncio de una empresa que el usuario puede ver.
    validar_opcion(datos.tipoContrato, TIPOS_CONTRATO, "Tipo de contrato")
    visibles = await anuncios_visibles(usuario)
    if visibles is not None and datos.anuncioId not in visibles:
        raise RecursoNoEncontrado("Anuncio no encontrado")

    # PASO 2: la postulación debe existir, no estar descartada y no tener ya una contratación.
    proceso = await buscar_proceso(sesion, datos.postulanteId, datos.anuncioId)
    if proceso is None:
        raise RecursoNoEncontrado("Ese postulante no está postulado a ese anuncio")
    exigir_postulacion_abierta(proceso.estado_actual)
    ya_existe = await sesion.execute(select(Contratacion.id).where(Contratacion.proceso_id == proceso.id))
    if ya_existe.first() is not None:
        raise ConflictoDeEstado("Esta postulación ya tiene una contratación registrada")

    # PASO 3: contratar = pasar la postulación a "Contratado" (con su línea en el historial)...
    nombre = usuario["nombre"] or USUARIO_POR_DEFECTO
    if proceso.estado_actual != "CONTRATADO":
        proceso.estado_actual = "CONTRATADO"
        sesion.add(
            HistorialEstado(
                proceso_id=proceso.id,
                estado="CONTRATADO",
                usuario_responsable=nombre,
                comentario="Contratación registrada",
            )
        )

    # PASO 4: ...guardar la contratación y programar sus controles de 30, 60 y 90 días.
    contratacion = Contratacion(
        proceso=proceso,
        fecha_ingreso=datos.fechaIngreso,
        cargo=datos.cargo,
        tipo_contrato=datos.tipoContrato,
        salario=datos.salario,
        moneda=datos.moneda.upper(),
        estado=estado_inicial_de_contratacion(datos.fechaIngreso),
        observaciones=datos.observaciones or None,
        creado_por=nombre,
    )
    contratacion.seguimientos = [
        SeguimientoPostingreso(hito_dias=hito, fecha_programada=fecha_de_seguimiento(datos.fechaIngreso, hito))
        for hito in HITOS_SEGUIMIENTO
    ]
    sesion.add(contratacion)
    await sesion.commit()
    return contratacion_a_respuesta(contratacion)


# ---------------------------------------------------------------------------
# Corregir / cambiar de estado
# ---------------------------------------------------------------------------
@router.patch("/{contratacion_id}", response_model=ContratacionRespuesta)
async def actualizar_contratacion(
    contratacion_id: str,
    datos: ContratacionActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> ContratacionRespuesta:
    resultado = await sesion.execute(
        select(Contratacion)
        .options(joinedload(Contratacion.proceso), joinedload(Contratacion.seguimientos))
        .where(Contratacion.id == contratacion_id)
    )
    contratacion = resultado.unique().scalar_one_or_none()
    visibles = await anuncios_visibles(usuario)
    if contratacion is None or (visibles is not None and contratacion.proceso.anuncio_id not in visibles):
        raise RecursoNoEncontrado("Contratación no encontrada")

    cambios = datos.model_dump(exclude_unset=True)
    validar_opcion(cambios.get("tipoContrato"), TIPOS_CONTRATO, "Tipo de contrato")
    validar_opcion(cambios.get("estado"), ESTADOS_CONTRATACION, "Estado")

    for campo, columna in (
        ("cargo", "cargo"),
        ("tipoContrato", "tipo_contrato"),
        ("salario", "salario"),
        ("estado", "estado"),
    ):
        if campo in cambios and (cambios[campo] is not None or campo == "salario"):
            setattr(contratacion, columna, cambios[campo])
    if cambios.get("moneda"):
        contratacion.moneda = cambios["moneda"].upper()
    if "observaciones" in cambios:
        contratacion.observaciones = cambios["observaciones"] or None

    # Si cambia la fecha de ingreso, los controles que todavía están pendientes se corren con ella.
    if cambios.get("fechaIngreso") and cambios["fechaIngreso"] != contratacion.fecha_ingreso:
        contratacion.fecha_ingreso = cambios["fechaIngreso"]
        for seguimiento in contratacion.seguimientos:
            if seguimiento.estado == "Pendiente" and seguimiento.hito_dias in HITOS_SEGUIMIENTO:
                seguimiento.fecha_programada = fecha_de_seguimiento(contratacion.fecha_ingreso, seguimiento.hito_dias)

    # Una contratación cancelada o finalizada ya no necesita los controles que quedaban pendientes.
    if contratacion.estado in ("Cancelado", "Finalizado"):
        for seguimiento in contratacion.seguimientos:
            if seguimiento.estado == "Pendiente":
                seguimiento.estado = "Omitido"

    await sesion.commit()
    return contratacion_a_respuesta(contratacion)
