"""Rutas de las entrevistas de una postulación.

Rutas (prefijo /entrevistas). El navegador las llama a través del Gateway, como /api/v1/entrevistas...:
    GET    /entrevistas?postulanteId=&anuncioId=&estado=&desde=&hasta=   → agenda / historial de entrevistas
    POST   /entrevistas                                                  → programar una entrevista (Admin, RRHH)
    PATCH  /entrevistas/{id}                                             → reprogramar, cerrar o anotar cómo salió (Admin, RRHH)

Como en todo el servicio, RRHH y Supervisor solo ven las entrevistas de postulaciones a anuncios de las
empresas que un Admin les asignó; lo demás responde 404.
"""
from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from app.api.comunes import USUARIO_POR_DEFECTO, buscar_proceso, con_zona_horaria, entrevista_a_respuesta
from app.api.deps import requerir_rol
from app.api.visibilidad import anuncios_visibles
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.dashboard import limites_del_rango
from app.domain.seleccion import (
    ESTADOS_ENTREVISTA,
    MODALIDADES_ENTREVISTA,
    RESULTADOS_ENTREVISTA,
    exigir_postulacion_abierta,
    validar_opcion,
)
from app.infrastructure.models import Entrevista, HistorialEstado, ProcesoPostulacion
from app.schemas.seleccion import EntrevistaActualizar, EntrevistaCrear, EntrevistaRespuesta
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado, SolicitudInvalida

router = APIRouter(prefix="/entrevistas", tags=["entrevistas"])


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[EntrevistaRespuesta])
async def listar_entrevistas(
    postulanteId: str | None = None,
    anuncioId: int | None = None,
    estado: str | None = None,
    desde: date | None = None,  # las entrevistas cuya fecha cae entre "desde" y "hasta" (ambos incluidos, hora de Perú)
    hasta: date | None = None,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[EntrevistaRespuesta]:
    validar_opcion(estado, ESTADOS_ENTREVISTA, "Estado")
    visibles = await anuncios_visibles(usuario)

    # La postulación se trae en la MISMA consulta (join): así cada entrevista sabe de qué postulante y anuncio es.
    consulta = (
        select(Entrevista)
        .join(ProcesoPostulacion, Entrevista.proceso_id == ProcesoPostulacion.id)
        .options(contains_eager(Entrevista.proceso))
        .order_by(Entrevista.fecha_hora)
    )
    if postulanteId:
        consulta = consulta.where(ProcesoPostulacion.postulante_id == postulanteId)
    if anuncioId is not None:
        consulta = consulta.where(ProcesoPostulacion.anuncio_id == anuncioId)
    if estado:
        consulta = consulta.where(Entrevista.estado == estado)
    if desde is not None:
        consulta = consulta.where(Entrevista.fecha_hora >= limites_del_rango(desde, desde)[0])
    if hasta is not None:
        consulta = consulta.where(Entrevista.fecha_hora < limites_del_rango(hasta, hasta)[1])
    if visibles is not None:  # RRHH / Supervisor: solo anuncios de sus empresas
        consulta = consulta.where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))

    resultado = await sesion.execute(consulta)
    return [entrevista_a_respuesta(e) for e in resultado.scalars().all()]


# ---------------------------------------------------------------------------
# Programar
# ---------------------------------------------------------------------------
@router.post("", response_model=EntrevistaRespuesta, status_code=status.HTTP_201_CREATED)
async def programar_entrevista(
    datos: EntrevistaCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> EntrevistaRespuesta:
    # PASO 1: datos válidos y anuncio de una empresa que el usuario puede ver.
    validar_opcion(datos.modalidad, MODALIDADES_ENTREVISTA, "Modalidad")
    visibles = await anuncios_visibles(usuario)
    if visibles is not None and datos.anuncioId not in visibles:
        raise RecursoNoEncontrado("Anuncio no encontrado")

    # PASO 2: la postulación debe existir y seguir abierta.
    proceso = await buscar_proceso(sesion, datos.postulanteId, datos.anuncioId)
    if proceso is None:
        raise RecursoNoEncontrado("Ese postulante no está postulado a ese anuncio")
    exigir_postulacion_abierta(proceso.estado_actual)
    if proceso.estado_actual == "CONTRATADO":
        raise ConflictoDeEstado("Esta postulación ya terminó en contratación")

    # PASO 3: crear la entrevista. Si nadie indicó quién entrevista, es quien la programa.
    nombre = usuario["nombre"] or USUARIO_POR_DEFECTO
    entrevista = Entrevista(
        proceso=proceso,
        fecha_hora=con_zona_horaria(datos.fechaHora),
        duracion_min=datos.duracionMin,
        modalidad=datos.modalidad,
        lugar_o_enlace=datos.lugarOEnlace or None,
        entrevistador=datos.entrevistador or nombre,
        notas=datos.notas or None,
        creado_por=nombre,
    )
    sesion.add(entrevista)

    # PASO 4: programar una entrevista significa que la postulación ya está en la etapa "Entrevista":
    # si iba más atrás, se mueve (y queda anotado en el historial).
    if proceso.estado_actual in ("POSTULADO", "EN_EVALUACION"):
        proceso.estado_actual = "ENTREVISTA"
        sesion.add(
            HistorialEstado(
                proceso_id=proceso.id,
                estado="ENTREVISTA",
                usuario_responsable=nombre,
                comentario="Entrevista programada",
            )
        )
    await sesion.commit()
    return entrevista_a_respuesta(entrevista)


# ---------------------------------------------------------------------------
# Reprogramar / cerrar
# ---------------------------------------------------------------------------
@router.patch("/{entrevista_id}", response_model=EntrevistaRespuesta)
async def actualizar_entrevista(
    entrevista_id: str,
    datos: EntrevistaActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> EntrevistaRespuesta:
    resultado = await sesion.execute(
        select(Entrevista).options(joinedload(Entrevista.proceso)).where(Entrevista.id == entrevista_id)
    )
    entrevista = resultado.scalar_one_or_none()
    visibles = await anuncios_visibles(usuario)
    if entrevista is None or (visibles is not None and entrevista.proceso.anuncio_id not in visibles):
        raise RecursoNoEncontrado("Entrevista no encontrada")

    cambios = datos.model_dump(exclude_unset=True)
    validar_opcion(cambios.get("modalidad"), MODALIDADES_ENTREVISTA, "Modalidad")
    validar_opcion(cambios.get("estado"), ESTADOS_ENTREVISTA, "Estado")
    validar_opcion(cambios.get("resultado"), RESULTADOS_ENTREVISTA, "Resultado")

    estado_final = cambios.get("estado", entrevista.estado)
    # El resultado solo tiene sentido en una entrevista ya realizada.
    if cambios.get("resultado") and estado_final != "Realizada":
        raise SolicitudInvalida("El resultado solo se registra en una entrevista realizada")

    if "fechaHora" in cambios and cambios["fechaHora"] is not None:
        entrevista.fecha_hora = con_zona_horaria(cambios["fechaHora"])
    # (campo del JSON, columna, ¿se puede dejar vacío?). Los datos obligatorios no se pueden borrar.
    for campo, columna, admite_vacio in (
        ("duracionMin", "duracion_min", False),
        ("modalidad", "modalidad", False),
        ("lugarOEnlace", "lugar_o_enlace", True),
        ("entrevistador", "entrevistador", False),
        ("estado", "estado", False),
        ("resultado", "resultado", True),
        ("notas", "notas", True),
    ):
        if campo not in cambios:
            continue
        valor = cambios[campo]
        if valor in (None, "") and not admite_vacio:
            continue
        setattr(entrevista, columna, valor or None)
    if estado_final != "Realizada":
        entrevista.resultado = None  # una entrevista que no está realizada no puede tener resultado

    await sesion.commit()
    return entrevista_a_respuesta(entrevista)
