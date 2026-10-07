"""Rutas de postulantes: listar, ver uno, crear y editar.

Rutas (prefijo /postulantes). El navegador las llama a través del Gateway,
como /api/v1/postulantes...:
    GET    /postulantes         → listar todos      (Admin, RRHH, Supervisor)
    GET    /postulantes/{id}    → ver uno           (Admin, RRHH, Supervisor)
    POST   /postulantes         → crear             (ANUNCIOS al registrarse, o RRHH a mano; 409 si el documento o el correo ya existen)
    PATCH  /postulantes/{id}    → editar            (Admin, RRHH, Supervisor)
    POST   /postulantes/{id}/solicitar-cuenta → enviar por correo (Mailjet) la invitación a crear su cuenta
                                                (Admin, RRHH, Supervisor; 409 si ya tiene cuenta)

Estas funciones son "delgadas" a propósito: reciben la petición, aplican la
regla de negocio (domain/postulantes.py) y guardan/leen en la base de datos.
"""
import asyncio
import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual, requerir_rol
from app.api.visibilidad import exigir_postulante_visible, postulantes_ocultos
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.postulantes import validar_consentimiento_obligatorio, validar_documento, validar_telefono
from app.infrastructure.correo import correo_solicitud_cuenta, enviar_correo
from app.infrastructure.models import InvitacionCuenta, Postulante, Usuario
from app.schemas.postulante import (
    PostulanteActualizar,
    PostulanteCrear,
    PostulanteRespuesta,
    SolicitudCuentaRespuesta,
)
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


# "¿Tiene cuenta?" se calcula EN LA MISMA consulta que trae al postulante (un solo viaje a la base de
# datos, que es lo que más tarda). Una cuenta "Eliminada" no cuenta.
_TIENE_CUENTA = select(Usuario.id).where(Usuario.postulante_id == Postulante.id, Usuario.estado != "Eliminado").exists()


async def _obtener_con_cuenta(sesion: AsyncSession, postulante_id: str) -> tuple[Postulante, bool]:
    """Busca un postulante y a la vez si tiene cuenta; si no existe, responde 404."""
    fila = (await sesion.execute(select(Postulante, _TIENE_CUENTA).where(Postulante.id == postulante_id))).first()
    if fila is None:
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")
    return fila[0], bool(fila[1])


# ---------------------------------------------------------------------------
# Listar y ver uno
# ---------------------------------------------------------------------------
@router.get("", response_model=list[PostulanteRespuesta])
async def listar_postulantes(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),  # un Postulante NO puede ver a los demás
) -> list[PostulanteRespuesta]:
    # La consulta a la base y la pregunta "¿cuáles debo ocultar?" (empresas que este usuario no tiene
    # asignadas) no dependen entre sí: se hacen a la vez.
    resultado, ocultos = await asyncio.gather(
        sesion.execute(select(Postulante, _TIENE_CUENTA)),  # equivale a: SELECT * FROM postulantes
        postulantes_ocultos(usuario),
    )
    return [_a_respuesta(p, tiene_cuenta) for p, tiene_cuenta in resultado.all() if p.id not in ocultos]


@router.get("/{postulante_id}", response_model=PostulanteRespuesta, dependencies=[Depends(exigir_postulante_visible)])
async def obtener_postulante(
    postulante_id: str,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    # Solo el personal del ERP: un Postulante (cuenta pública de ANUNCIOS) no tiene filtro de
    # empresas, así que sin esta regla podría leer los datos personales de cualquier otro.
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> PostulanteRespuesta:
    postulante, tiene_cuenta = await _obtener_con_cuenta(sesion, postulante_id)
    return _a_respuesta(postulante, tiene_cuenta)


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
    validar_documento(datos.documentoTipo, datos.documentoNumero)
    validar_telefono(datos.telefono)

    # PASO 1b: no puede haber dos postulantes con el mismo documento ni el mismo correo.
    mismo_documento = select(Postulante.id).where(Postulante.documento_numero == datos.documentoNumero)
    if (await sesion.execute(mismo_documento)).first():
        raise ConflictoDeEstado("Ya existe un postulante con ese número de documento")
    mismo_correo = select(Postulante.id).where(func.lower(Postulante.email) == datos.email)
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
    await sesion.commit()  # "commit" = confirmar y guardar de verdad
    # (el id y la fecha de registro ya quedaron puestos en el objeto: no hace falta volver a leerlo)
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
    postulante, tiene_cuenta = await _obtener_con_cuenta(sesion, postulante_id)

    # Solo los campos que realmente se enviaron (lo demás queda como estaba).
    cambios = datos.model_dump(exclude_unset=True)
    if "telefono" in cambios:
        validar_telefono(cambios["telefono"])

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
    return _a_respuesta(postulante, tiene_cuenta)


# ---------------------------------------------------------------------------
# Solicitar cuenta: invitar por correo a un postulante a crear su cuenta
# ---------------------------------------------------------------------------
# Un mismo postulante no puede recibir otra invitación hasta que pase este tiempo: evita
# mandarle varios correos por un doble clic (o que alguien llene su bandeja de entrada).
_ESPERA_ENTRE_INVITACIONES_SEGUNDOS = 120
_DIAS_VIGENCIA_INVITACION = 7
_ultima_invitacion: dict[str, float] = {}  # postulante_id -> hora (monotonic) del último envío


@router.post(
    "/{postulante_id}/solicitar-cuenta",
    response_model=SolicitudCuentaRespuesta,
    dependencies=[Depends(exigir_postulante_visible)],
)
async def solicitar_cuenta(
    postulante_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> SolicitudCuentaRespuesta:
    """Envía (con Mailjet) un correo al postulante invitándolo a crear su cuenta en ANUNCIOS."""
    postulante, tiene_cuenta = await _obtener_con_cuenta(sesion, postulante_id)
    if tiene_cuenta:
        raise ConflictoDeEstado("Este postulante ya tiene una cuenta")

    ahora = time.monotonic()
    anterior = _ultima_invitacion.get(postulante_id)
    if anterior is not None and ahora - anterior < _ESPERA_ENTRE_INVITACIONES_SEGUNDOS:
        raise ConflictoDeEstado("Ya se le envió una invitación hace un momento. Espera unos minutos para reenviarla.")

    # Invitación de un solo uso (7 días). Las anteriores sin usar dejan de valer: solo sirve la última.
    momento = datetime.now(timezone.utc)
    await sesion.execute(
        update(InvitacionCuenta)
        .where(InvitacionCuenta.postulante_id == postulante_id, InvitacionCuenta.usado_en.is_(None))
        .values(usado_en=momento)
    )
    token = secrets.token_urlsafe(32)
    sesion.add(
        InvitacionCuenta(
            postulante_id=postulante_id,
            token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            expira_en=momento + timedelta(days=_DIAS_VIGENCIA_INVITACION),
        )
    )

    asunto, html_cuerpo, texto = correo_solicitud_cuenta(postulante.nombres, postulante.email, token)
    nombre_completo = f"{postulante.nombres} {postulante.apellidos}"
    await enviar_correo(postulante.email, nombre_completo, asunto, html_cuerpo, texto)
    await sesion.commit()  # se guarda solo si el correo salió
    _ultima_invitacion[postulante_id] = ahora
    return SolicitudCuentaRespuesta(enviadoA=postulante.email)
