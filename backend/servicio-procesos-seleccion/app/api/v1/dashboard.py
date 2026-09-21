"""Ruta del Dashboard: los indicadores de reclutamiento.

Ruta (prefijo /dashboard). El navegador la llama a través del Gateway, como /api/v1/dashboard:
    GET  /dashboard?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&empresaId=N   → todos los indicadores de una vez

  - Sin fechas: los últimos 30 días (hasta hoy, hora de Perú).
  - Sin empresaId: todas las empresas que el usuario puede ver (un Admin ve todas; RRHH y
    Supervisor solo las que un Admin les asignó, ver shared_kernel/visibilidad.py).

Los anuncios y las empresas viven en servicio-empresas-vacantes: se le piden con la identidad
del usuario, así el filtro por empresa ya viene aplicado. Las postulaciones, el historial y las
evaluaciones son de este servicio. El cálculo en sí está en domain/dashboard.py.
"""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.api.visibilidad import postulantes_ocultos
from app.core.config import settings
from app.core.database import obtener_sesion
from app.domain.dashboard import MAXIMO_DIAS_DE_RANGO, ZONA_PERU, calcular_dashboard
from app.infrastructure.models import Evaluacion, HistorialEstado, ProcesoPostulacion
from shared_kernel.exceptions import RecursoNoEncontrado, SolicitudInvalida
from shared_kernel.visibilidad import llamar_a_servicio

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def obtener_dashboard(
    desde: date | None = None,
    hasta: date | None = None,
    empresaId: int | None = None,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> dict:
    # PASO 1: el rango de fechas (por defecto, los últimos 30 días).
    hasta = hasta or datetime.now(ZONA_PERU).date()
    desde = desde or hasta - timedelta(days=29)
    if desde > hasta:
        raise SolicitudInvalida("La fecha \"desde\" no puede ser posterior a la fecha \"hasta\"")
    if (hasta - desde).days > MAXIMO_DIAS_DE_RANGO:
        raise SolicitudInvalida("El rango de fechas es demasiado largo (máximo 5 años)")

    # PASO 2: los anuncios que el usuario puede ver (y, si eligió una empresa, solo los de ella).
    anuncios = await llamar_a_servicio(
        settings.url_servicio_empresas_vacantes, "/anuncios", usuario, settings.gateway_shared_secret
    )
    if empresaId is not None:
        anuncios = [a for a in anuncios if a["empresaId"] == empresaId]
        if not anuncios:
            # Una empresa sin anuncios es válida, pero una empresa que el usuario no puede ver (o que
            # no existe) debe responder 404, no "vacía".
            empresas = await llamar_a_servicio(
                settings.url_servicio_empresas_vacantes, "/empresas", usuario, settings.gateway_shared_secret
            )
            if empresaId not in {e["id"] for e in empresas}:
                raise RecursoNoEncontrado("Empresa no encontrada")
    ids_anuncios = [a["id"] for a in anuncios]

    # PASO 3: las postulaciones a esos anuncios y su historial de etapas.
    procesos_bd: list[ProcesoPostulacion] = []
    eventos_bd: list[HistorialEstado] = []
    if ids_anuncios:
        procesos_bd = list(
            (await sesion.execute(select(ProcesoPostulacion).where(ProcesoPostulacion.anuncio_id.in_(ids_anuncios))))
            .scalars()
            .all()
        )
        if procesos_bd:
            eventos_bd = list(
                (
                    await sesion.execute(
                        select(HistorialEstado)
                        .where(HistorialEstado.proceso_id.in_([p.id for p in procesos_bd]))
                        .order_by(HistorialEstado.fecha)
                    )
                )
                .scalars()
                .all()
            )

    procesos = [
        {
            "id": p.id,
            "postulanteId": p.postulante_id,
            "anuncioId": p.anuncio_id,
            "estado": p.estado_actual,
            "fecha": p.fecha_postulacion,
        }
        for p in procesos_bd
    ]
    eventos = [
        {"procesoId": e.proceso_id, "estado": e.estado, "fecha": e.fecha, "usuario": e.usuario_responsable}
        for e in eventos_bd
    ]
    # La fecha de contratación es la del ÚLTIMO cambio a "Contratado" (por si se revirtió y se volvió a marcar).
    contrataciones: dict[str, datetime] = {}
    for e in eventos:
        if e["estado"] == "CONTRATADO":
            contrataciones[e["procesoId"]] = e["fecha"]

    # PASO 4: las evaluaciones del periodo. Si hay un filtro de empresa (elegido o por asignación), solo
    # cuentan las de postulantes que postularon a esos anuncios; un Admin sin filtro ve todas.
    consulta = select(Evaluacion).where(Evaluacion.fecha >= desde, Evaluacion.fecha <= hasta)
    if empresaId is not None or usuario["empresas"] is not None:
        consulta = consulta.where(Evaluacion.postulante_id.in_(list({p["postulanteId"] for p in procesos})))
    ocultos = await postulantes_ocultos(sesion, usuario)
    if ocultos:
        consulta = consulta.where(Evaluacion.postulante_id.not_in(list(ocultos)))
    evaluaciones = [
        {
            "puntaje": e.puntaje_total,
            "resultado": e.resultado,
            "competencias": {
                "comunicacionEfectiva": e.comunicacion_efectiva,
                "orientacionCliente": e.orientacion_cliente,
                "responsabilidad": e.responsabilidad,
                "adaptabilidadFlexibilidad": e.adaptabilidad_flexibilidad,
                "toleranciaPresion": e.tolerancia_presion,
                "dinamismoEnergia": e.dinamismo_energia,
            },
        }
        for e in (await sesion.execute(consulta)).scalars().all()
    ]

    # PASO 5: calcular y devolver.
    return calcular_dashboard(
        desde=desde,
        hasta=hasta,
        anuncios=anuncios,
        procesos=procesos,
        contrataciones=contrataciones,
        eventos=eventos,
        evaluaciones=evaluaciones,
    )
