"""Plantillas de WhatsApp (Meta). Hacen falta para escribirle a un postulante que no ha
mandado ningún mensaje en las últimas 24 horas: fuera de esa ventana WhatsApp no deja
enviar texto libre.

    GET    /comunicaciones/plantillas                      → listar (con su estado en Meta)
    POST   /comunicaciones/plantillas                      → crear (Meta la revisa: PENDING → APPROVED)
    DELETE /comunicaciones/plantillas/{nombre}             → eliminar
    POST   /comunicaciones/conversaciones/{id}/plantilla   → enviar una plantilla aprobada al chat

Y las PLANTILLAS RÁPIDAS del chat (textos propios, guardados en nuestra base, no en Meta):
    GET    /comunicaciones/plantillas-rapidas              → las 3 del botón "Plantillas" del chat
    PUT    /comunicaciones/plantillas-rapidas/{id}         → editar una (Admin, RRHH)
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.api.visibilidad import exigir_conversacion_visible
from app.core.config import settings
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.plantillas import contar_variables, rellenar, validar_cuerpo
from app.infrastructure import whatsapp_client
from app.infrastructure.models import Conversacion, Mensaje, PlantillaRapida
from app.schemas.mensaje import (
    MensajeRespuesta,
    PlantillaCrear,
    PlantillaEnviar,
    PlantillaRapidaActualizar,
    PlantillaRapidaRespuesta,
    PlantillaRespuesta,
)
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado, SolicitudInvalida
from shared_kernel.visibilidad import llamar_a_servicio

router = APIRouter(prefix="/comunicaciones", tags=["plantillas"])


def _cuerpo(plantilla_meta: dict) -> str:
    return next(
        (c.get("text", "") for c in plantilla_meta.get("components", []) if c.get("type") == "BODY"), ""
    )


def _a_respuesta(p: dict) -> PlantillaRespuesta:
    cuerpo = _cuerpo(p)
    motivo = p.get("rejected_reason")
    return PlantillaRespuesta(
        nombre=p["name"],
        categoria=p.get("category", ""),
        idioma=p.get("language", ""),
        estado=p.get("status", ""),
        cuerpo=cuerpo,
        variables=contar_variables(cuerpo),
        motivo_rechazo=motivo if motivo not in (None, "NONE") else None,
    )


@router.get("/plantillas", response_model=list[PlantillaRespuesta])
async def listar_plantillas(
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[PlantillaRespuesta]:
    return [_a_respuesta(p) for p in await whatsapp_client.listar_plantillas()]


@router.post("/plantillas", response_model=PlantillaRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_plantilla(
    datos: PlantillaCrear,
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> PlantillaRespuesta:
    validar_cuerpo(datos.cuerpo, datos.ejemplos)
    creada = await whatsapp_client.crear_plantilla(
        datos.nombre, datos.categoria, datos.idioma, datos.cuerpo, datos.ejemplos
    )
    return PlantillaRespuesta(
        nombre=datos.nombre,
        categoria=creada.get("category", datos.categoria),
        idioma=datos.idioma,
        estado=creada.get("status", "PENDING"),
        cuerpo=datos.cuerpo,
        variables=contar_variables(datos.cuerpo),
    )


@router.delete("/plantillas/{nombre}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_plantilla(
    nombre: str,
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> None:
    await whatsapp_client.eliminar_plantilla(nombre)


# Quién "pregunta" a servicio-postulantes por el consentimiento (lectura interna, sin filtro de empresas:
# la visibilidad de la conversación ya se comprobó con exigir_conversacion_visible).
_USUARIO_SISTEMA = {"id": "servicio-comunicaciones", "rol": "Admin", "nombre": "WhatsApp"}


async def _acepto_comunicaciones_comerciales(conversacion: Conversacion) -> bool:
    """Ley de Protección de Datos Personales: el marketing solo a quien lo aceptó. Un número no
    registrado (sin postulante) no dio consentimiento."""
    if not conversacion.postulante_id:
        return False
    postulante = await llamar_a_servicio(
        settings.url_servicio_postulantes,
        f"/postulantes/{conversacion.postulante_id}",
        _USUARIO_SISTEMA,
        settings.gateway_shared_secret,
        permitir_404=True,
    )
    return bool(postulante and postulante.get("consentimientoComunicacionesComerciales"))


@router.post(
    "/conversaciones/{conversacion_id}/plantilla",
    response_model=MensajeRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_conversacion_visible)],
)
async def enviar_plantilla(
    conversacion_id: str,
    datos: PlantillaEnviar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> Mensaje:
    conversacion = await sesion.get(Conversacion, conversacion_id)
    if conversacion is None:
        raise RecursoNoEncontrado("Conversación no encontrada")

    plantilla = next(
        (p for p in await whatsapp_client.listar_plantillas(datos.nombre)
         if p["name"] == datos.nombre and p.get("language") == datos.idioma),
        None,
    )
    if plantilla is None:
        raise RecursoNoEncontrado(f"La plantilla {datos.nombre} ({datos.idioma}) no existe")
    if plantilla.get("status") != "APPROVED":
        raise ConflictoDeEstado("Solo se pueden enviar plantillas aprobadas por Meta")
    if plantilla.get("category") == "MARKETING" and not await _acepto_comunicaciones_comerciales(conversacion):
        raise ConflictoDeEstado(
            "El postulante no aceptó recibir comunicaciones comerciales: solo puedes enviarle plantillas de servicio"
        )
    cuerpo = _cuerpo(plantilla)
    if len(datos.variables) != contar_variables(cuerpo) or any(not v.strip() for v in datos.variables):
        raise SolicitudInvalida(f"Completa las {contar_variables(cuerpo)} variables de la plantilla")

    respuesta = await whatsapp_client.enviar_plantilla(
        conversacion.telefono, datos.nombre, datos.idioma, datos.variables
    )

    ahora = datetime.now(timezone.utc)
    mensaje = Mensaje(
        conversacion_id=conversacion.id,
        remitente="yo",
        texto=rellenar(cuerpo, datos.variables),
        estado="enviado",
        wamid=(respuesta.get("messages") or [{}])[0].get("id"),
        fecha=ahora,
    )
    sesion.add(mensaje)
    conversacion.ultima_actividad = ahora
    await sesion.commit()
    await sesion.refresh(mensaje)
    return mensaje



# ---------------------------------------------------------------------------
# Plantillas rápidas del chat
# ---------------------------------------------------------------------------
@router.get("/plantillas-rapidas", response_model=list[PlantillaRapidaRespuesta])
async def listar_plantillas_rapidas(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[PlantillaRapida]:
    resultado = await sesion.execute(select(PlantillaRapida).order_by(PlantillaRapida.orden))
    return list(resultado.scalars().all())


@router.put("/plantillas-rapidas/{plantilla_id}", response_model=PlantillaRapidaRespuesta)
async def editar_plantilla_rapida(
    plantilla_id: str,
    datos: PlantillaRapidaActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> PlantillaRapida:
    plantilla = await sesion.get(PlantillaRapida, plantilla_id)
    if plantilla is None:
        raise RecursoNoEncontrado("Plantilla no encontrada")
    plantilla.titulo = datos.titulo.strip()
    plantilla.descripcion = datos.descripcion.strip()
    plantilla.contenido = datos.contenido.strip()
    plantilla.actualizada_en = datetime.now(timezone.utc)
    await sesion.commit()
    await sesion.refresh(plantilla)
    return plantilla
