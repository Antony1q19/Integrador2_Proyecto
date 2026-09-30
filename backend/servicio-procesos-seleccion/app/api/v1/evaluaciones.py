"""Rutas de las evaluaciones por competencias de un postulante.

Rutas (prefijo /evaluaciones). El navegador las llama a través del Gateway,
como /api/v1/evaluaciones...:
    GET    /evaluaciones?postulanteId=...   → ver las evaluaciones de un postulante
    POST   /evaluaciones                    → registrar una evaluación (Admin, RRHH)
RRHH y Supervisor no ven las evaluaciones de postulantes de empresas que no tienen asignadas.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.api.visibilidad import postulantes_ocultos
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.evaluaciones import calcular_puntaje_total, calcular_resultado
from app.infrastructure.models import Evaluacion
from app.schemas.evaluacion import Competencias, EvaluacionCrear, EvaluacionRespuesta
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/evaluaciones", tags=["evaluaciones"])

# Nombre que se guarda como evaluador si, por algún motivo, no llega el nombre del usuario.
_USUARIO_POR_DEFECTO = "Usuario RRHH"


def _a_respuesta(e: Evaluacion) -> EvaluacionRespuesta:
    """Convierte una fila de la base de datos (columnas con guion bajo) al JSON del frontend."""
    return EvaluacionRespuesta(
        id=e.id,
        postulanteId=e.postulante_id,
        evaluador=e.evaluador,
        fecha=e.fecha,
        competencias=Competencias(
            comunicacionEfectiva=e.comunicacion_efectiva,
            orientacionCliente=e.orientacion_cliente,
            responsabilidad=e.responsabilidad,
            adaptabilidadFlexibilidad=e.adaptabilidad_flexibilidad,
            toleranciaPresion=e.tolerancia_presion,
            dinamismoEnergia=e.dinamismo_energia,
        ),
        puntajeTotal=e.puntaje_total,
        resultado=e.resultado,
        comentarios=e.comentarios or "",
    )


@router.get("", response_model=list[EvaluacionRespuesta])
async def listar_evaluaciones(
    postulanteId: str | None = None,  # opcional: si se envía, solo las de ese postulante
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[EvaluacionRespuesta]:
    ocultos = await postulantes_ocultos(sesion, usuario)
    consulta = select(Evaluacion).order_by(Evaluacion.fecha, Evaluacion.id)
    if postulanteId:
        consulta = consulta.where(Evaluacion.postulante_id == postulanteId)
    if ocultos:
        consulta = consulta.where(Evaluacion.postulante_id.not_in(list(ocultos)))
    resultado = await sesion.execute(consulta)
    return [_a_respuesta(e) for e in resultado.scalars().all()]


@router.post("", response_model=EvaluacionRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_evaluacion(
    datos: EvaluacionCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> EvaluacionRespuesta:
    # PASO 0: el postulante no debe ser de una empresa que el usuario no puede ver.
    if datos.postulanteId in await postulantes_ocultos(sesion, usuario):
        raise RecursoNoEncontrado("Postulante no encontrado")

    c = datos.competencias

    # PASO 1: el servidor calcula el puntaje y el resultado (no se fía de lo que
    # pudiera enviar el navegador).
    puntaje = calcular_puntaje_total(
        [
            c.comunicacionEfectiva,
            c.orientacionCliente,
            c.responsabilidad,
            c.adaptabilidadFlexibilidad,
            c.toleranciaPresion,
            c.dinamismoEnergia,
        ]
    )

    # PASO 2: guardar la evaluación; el evaluador es quien tiene la sesión iniciada.
    evaluacion = Evaluacion(
        postulante_id=datos.postulanteId,
        evaluador=usuario["nombre"] or _USUARIO_POR_DEFECTO,
        comunicacion_efectiva=c.comunicacionEfectiva,
        orientacion_cliente=c.orientacionCliente,
        responsabilidad=c.responsabilidad,
        adaptabilidad_flexibilidad=c.adaptabilidadFlexibilidad,
        tolerancia_presion=c.toleranciaPresion,
        dinamismo_energia=c.dinamismoEnergia,
        puntaje_total=puntaje,
        resultado=calcular_resultado(puntaje),
        comentarios=datos.comentarios,
    )
    sesion.add(evaluacion)
    await sesion.commit()
    # (el id y la fecha ya quedaron puestos en el objeto: no hace falta volver a leerla)
    return _a_respuesta(evaluacion)
