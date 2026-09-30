"""Funciones que comparten las rutas de postulaciones, entrevistas, contrataciones y seguimientos."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.seleccion import ZONA_PERU, hoy_en_peru
from app.infrastructure.models import Contratacion, Entrevista, ProcesoPostulacion, SeguimientoPostingreso
from app.schemas.seleccion import ContratacionRespuesta, EntrevistaRespuesta, SeguimientoRespuesta

# Nombre que se guarda como responsable si, por algún motivo, no llega el nombre del usuario.
USUARIO_POR_DEFECTO = "Usuario RRHH"


async def buscar_proceso(sesion: AsyncSession, postulante_id: str, anuncio_id: int) -> ProcesoPostulacion | None:
    """Busca la postulación de ese postulante a ese anuncio (o None si no existe).

    No trae su historial: en la mayoría de rutas no hace falta, y así es una sola consulta liviana.
    """
    resultado = await sesion.execute(
        select(ProcesoPostulacion).where(
            ProcesoPostulacion.postulante_id == postulante_id,
            ProcesoPostulacion.anuncio_id == anuncio_id,
        )
    )
    return resultado.scalar_one_or_none()


def con_zona_horaria(fecha: datetime) -> datetime:
    """Si la fecha llega sin zona horaria (ej. "2026-10-01T09:00"), se entiende que es hora de Perú."""
    return fecha if fecha.tzinfo is not None else fecha.replace(tzinfo=ZONA_PERU)


# ---------------------------------------------------------------------------
# Convertir filas de la base de datos (nombres_con_guion_bajo) al JSON del frontend (camelCase).
# Necesitan la postulación cargada (`proceso`) para saber el postulante y el anuncio.
# ---------------------------------------------------------------------------
def entrevista_a_respuesta(e: Entrevista) -> EntrevistaRespuesta:
    return EntrevistaRespuesta(
        id=e.id,
        procesoId=e.proceso_id,
        postulanteId=e.proceso.postulante_id,
        anuncioId=e.proceso.anuncio_id,
        fechaHora=e.fecha_hora,
        duracionMin=e.duracion_min,
        modalidad=e.modalidad,
        lugarOEnlace=e.lugar_o_enlace,
        entrevistador=e.entrevistador,
        estado=e.estado,
        resultado=e.resultado,
        notas=e.notas,
        creadoPor=e.creado_por,
        fechaCreacion=e.fecha_creacion,
    )


def seguimiento_a_respuesta(s: SeguimientoPostingreso, proceso: ProcesoPostulacion) -> SeguimientoRespuesta:
    return SeguimientoRespuesta(
        id=s.id,
        contratacionId=s.contratacion_id,
        postulanteId=proceso.postulante_id,
        anuncioId=proceso.anuncio_id,
        hitoDias=s.hito_dias,
        fechaProgramada=s.fecha_programada,
        fechaRealizada=s.fecha_realizada,
        estado=s.estado,
        valoracion=s.valoracion,
        observaciones=s.observaciones,
        realizadoPor=s.realizado_por,
        vencido=s.estado == "Pendiente" and s.fecha_programada < hoy_en_peru(),
    )


def contratacion_a_respuesta(c: Contratacion) -> ContratacionRespuesta:
    return ContratacionRespuesta(
        id=c.id,
        procesoId=c.proceso_id,
        postulanteId=c.proceso.postulante_id,
        anuncioId=c.proceso.anuncio_id,
        fechaIngreso=c.fecha_ingreso,
        cargo=c.cargo,
        tipoContrato=c.tipo_contrato,
        salario=float(c.salario) if c.salario is not None else None,
        moneda=c.moneda,
        estado=c.estado,
        observaciones=c.observaciones,
        creadoPor=c.creado_por,
        fechaCreacion=c.fecha_creacion,
        seguimientos=[seguimiento_a_respuesta(s, c.proceso) for s in c.seguimientos],
    )
