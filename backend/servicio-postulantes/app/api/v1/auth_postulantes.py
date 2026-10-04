"""Rutas internas de autenticación y cuenta de postulantes.

Estas rutas son llamadas exclusivamente por el API Gateway mediante cabeceras
firmadas con HMAC (ver app/api/deps.py -> verificar_peticion_del_gateway).
"""
import hashlib
import secrets
from datetime import date, datetime, timedelta, timezone

from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, File, Header, HTTPException, Response, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import verificar_peticion_del_gateway
from app.core.config import settings
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.postulantes import (
    TAMANO_MAXIMO_BYTES,
    VERSION_TERMINOS,
    validar_archivo,
    validar_consentimiento_obligatorio,
)
from app.infrastructure.correo import enviar_correo_recuperacion
from app.infrastructure.models import Documento, Postulante, TokenRecuperacion, Usuario
from app.infrastructure.storage import descargar_archivo, eliminar_archivo, subir_archivo
from app.schemas.auth import (
    AceptarTerminosEntrada,
    AuthPostulanteRespuesta,
    LoginPostulanteEntrada,
    MePostulanteRespuesta,
    MensajeRespuesta,
    RecuperarPasswordEntrada,
    RegistroPostulanteEntrada,
    RestablecerPasswordEntrada,
    PerfilActualizarEntrada,
)
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado, SolicitudInvalida
from shared_kernel.passwords import (
    HASH_DUMMY,
    hash_password,
    validar_politica_password,
    verificar_password,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth-postulantes"],
    dependencies=[Depends(verificar_peticion_del_gateway)],
)


@router.post("/registro", response_model=AuthPostulanteRespuesta, status_code=status.HTTP_201_CREATED)
async def registrar_cuenta_postulante(
    datos: RegistroPostulanteEntrada,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> AuthPostulanteRespuesta:
    """Registra una cuenta de postulante enlazándola si ya existía el registro previo de RRHH."""
    # 1. Validar consentimiento obligatorio de tratamiento de datos personales (Ley N.º 29733)
    validar_consentimiento_obligatorio(datos.aceptaTratamientoDatos, "Postulante")

    # 2. Validar política de seguridad de la contraseña
    es_valida, motivo_error = validar_politica_password(datos.password, str(datos.email))
    if not es_valida:
        raise SolicitudInvalida(motivo_error or "Contraseña inválida según las políticas de seguridad")

    email_limpio = str(datos.email).strip().lower()

    # 3. ¿Ya existe una cuenta de usuario con este correo?
    consulta_usuario = select(Usuario).where(Usuario.email == email_limpio)
    usuario_existente = (await sesion.execute(consulta_usuario)).scalar_one_or_none()
    if usuario_existente is not None:
        # Respuesta neutra para evitar enumeración de correos
        raise ConflictoDeEstado("Si el correo ya está registrado, inicia sesión o recupera tu contraseña")

    # 4. ¿Existe un postulante previo registrado por RRHH con este correo?
    consulta_postulante = select(Postulante).where(Postulante.email == email_limpio)
    postulante = (await sesion.execute(consulta_postulante)).scalar_one_or_none()

    ahora = datetime.now(timezone.utc)

    if postulante is not None:
        # Enlazar la cuenta de usuario al postulante existente sin sobrescribir datos ya llenados
        postulante.consentimiento_tratamiento_datos = True
        postulante.consentimiento_comunicaciones_comerciales = datos.aceptaComunicaciones
        postulante.fecha_aceptacion_consentimiento = ahora
        postulante.version_terminos_aceptados = VERSION_TERMINOS
        postulante.ip_aceptacion = datos.ip

        # Si faltaban campos no obligatorios en el registro de RRHH, completarlos
        if not postulante.telefono and datos.telefono:
            postulante.telefono = datos.telefono
        if not postulante.fecha_nacimiento and datos.fechaNacimiento:
            postulante.fecha_nacimiento = datos.fechaNacimiento
    else:
        # Comprobar que no exista otro postulante con el mismo documento
        consulta_doc = select(Postulante.id).where(Postulante.documento_numero == datos.documentoNumero)
        if (await sesion.execute(consulta_doc)).first() is not None:
            raise ConflictoDeEstado("Ya existe un postulante con ese número de documento")

        # Crear postulante nuevo
        postulante = Postulante(
            nombres=datos.nombres.strip(),
            apellidos=datos.apellidos.strip(),
            documento_tipo=datos.documentoTipo,
            documento_numero=datos.documentoNumero.strip(),
            email=email_limpio,
            telefono=datos.telefono,
            fecha_nacimiento=datos.fechaNacimiento,
            consentimiento_tratamiento_datos=True,
            consentimiento_comunicaciones_comerciales=datos.aceptaComunicaciones,
            fecha_aceptacion_consentimiento=ahora,
            version_terminos_aceptados=VERSION_TERMINOS,
            ip_aceptacion=datos.ip,
            fecha_registro=date.today(),
        )
        sesion.add(postulante)
        await sesion.flush()  # Obtener el id generado

    # 5. Crear la cuenta en la tabla usuarios
    nuevo_usuario = Usuario(
        postulante_id=postulante.id,
        email=email_limpio,
        password_hash=hash_password(datos.password),
        estado="Activo",
    )
    sesion.add(nuevo_usuario)
    await sesion.commit()

    return AuthPostulanteRespuesta(
        usuarioId=nuevo_usuario.id,
        postulanteId=postulante.id,
        email=nuevo_usuario.email,
        nombre=f"{postulante.nombres} {postulante.apellidos}".strip(),
        requiereAceptarTerminos=False,
        versionTerminos=VERSION_TERMINOS,
    )


@router.post("/login", response_model=AuthPostulanteRespuesta)
async def login_postulante(
    datos: LoginPostulanteEntrada,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> AuthPostulanteRespuesta:
    """Verifica las credenciales del postulante protegiendo contra temporización y cuentas suspendidas."""
    email_limpio = str(datos.email).strip().lower()

    # Buscar usuario y sus datos de postulante
    consulta = (
        select(Usuario)
        .options(joinedload(Usuario.postulante))
        .where(Usuario.email == email_limpio)
    )
    resultado = await sesion.execute(consulta)
    usuario = resultado.scalar_one_or_none()

    # Si el usuario no existe, verificamos contra HASH_DUMMY para mantener tiempo equivalente
    if usuario is None:
        verificar_password(datos.password, HASH_DUMMY)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    # Comprobar la contraseña real
    if not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    # Verificar estado de la cuenta
    if usuario.estado != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está suspendida. Contacta a soporte.",
        )

    requiere_terminos = (
        usuario.postulante is None
        or usuario.postulante.version_terminos_aceptados != VERSION_TERMINOS
    )

    nombre_postulante = (
        f"{usuario.postulante.nombres} {usuario.postulante.apellidos}".strip()
        if usuario.postulante
        else usuario.email
    )

    return AuthPostulanteRespuesta(
        usuarioId=usuario.id,
        postulanteId=usuario.postulante_id,
        email=usuario.email,
        nombre=nombre_postulante,
        requiereAceptarTerminos=requiere_terminos,
        versionTerminos=(
            usuario.postulante.version_terminos_aceptados if usuario.postulante else None
        ),
    )


@router.post("/recuperar-password", response_model=MensajeRespuesta)
async def solicitar_recuperacion_password(
    datos: RecuperarPasswordEntrada,
    background_tasks: BackgroundTasks,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> MensajeRespuesta:
    """Genera token de recuperación y envía correo en segundo plano con respuesta 200 constante."""
    email_limpio = str(datos.email).strip().lower()

    consulta = (
        select(Usuario)
        .options(joinedload(Usuario.postulante))
        .where(Usuario.email == email_limpio)
    )
    resultado = await sesion.execute(consulta)
    usuario = resultado.scalar_one_or_none()

    # Si existe y está activo, creamos el token e iniciamos el envío en background
    if usuario is not None and usuario.estado == "Activo":
        ahora = datetime.now(timezone.utc)

        # Invalidar tokens anteriores pendientes de este usuario
        await sesion.execute(
            update(TokenRecuperacion)
            .where(TokenRecuperacion.usuario_id == usuario.id, TokenRecuperacion.usado_en.is_(None))
            .values(usado_en=ahora)
        )

        # Generar token aleatorio criptográfico
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        token_recup = TokenRecuperacion(
            usuario_id=usuario.id,
            token_hash=token_hash,
            expira_en=ahora + timedelta(minutes=30),
            ip=datos.ip,
        )
        sesion.add(token_recup)
        await sesion.commit()

        nombre_dest = (
            f"{usuario.postulante.nombres} {usuario.postulante.apellidos}".strip()
            if usuario.postulante
            else "Postulante"
        )
        background_tasks.add_task(enviar_correo_recuperacion, email_limpio, nombre_dest, raw_token)

    # Respuesta idéntica siempre para prevenir enumeración de correos
    return MensajeRespuesta(
        mensaje="Si el correo está registrado, te enviamos un enlace. Revisa también tu carpeta de spam."
    )


@router.post("/restablecer-password", response_model=MensajeRespuesta)
async def restablecer_password(
    datos: RestablecerPasswordEntrada,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> MensajeRespuesta:
    """Restablece la contraseña validando el token de un solo uso e invalidando sesiones previas."""
    # 1. Validar política de la nueva contraseña
    es_valida, motivo_error = validar_politica_password(datos.nuevaPassword)
    if not es_valida:
        raise SolicitudInvalida(motivo_error or "Contraseña inválida")

    token_hash = hashlib.sha256(datos.token.encode("utf-8")).hexdigest()
    ahora = datetime.now(timezone.utc)

    # 2. Buscar token válido, no usado y no expirado
    consulta_token = select(TokenRecuperacion).where(
        TokenRecuperacion.token_hash == token_hash,
        TokenRecuperacion.usado_en.is_(None),
        TokenRecuperacion.expira_en > ahora,
    )
    token_recup = (await sesion.execute(consulta_token)).scalar_one_or_none()

    if token_recup is None:
        raise SolicitudInvalida("El enlace no es válido o venció")

    # 3. Obtener el usuario asociado y verificar estado
    usuario = await sesion.get(Usuario, token_recup.usuario_id)
    if usuario is None or usuario.estado != "Activo":
        raise SolicitudInvalida("El enlace no es válido o venció")

    # Validar que no sea igual a su correo
    es_valida_correo, motivo_correo = validar_politica_password(datos.nuevaPassword, usuario.email)
    if not es_valida_correo:
        raise SolicitudInvalida(motivo_correo or "Contraseña inválida")

    # 4. Actualizar contraseña, registrar fecha de cambio para invalidar JWTs previos
    usuario.password_hash = hash_password(datos.nuevaPassword)
    usuario.password_cambiada_en = ahora

    # 5. Marcar token actual como usado e invalidar los demás del usuario
    await sesion.execute(
        update(TokenRecuperacion)
        .where(TokenRecuperacion.usuario_id == usuario.id, TokenRecuperacion.usado_en.is_(None))
        .values(usado_en=ahora)
    )

    await sesion.commit()
    return MensajeRespuesta(mensaje="Tu contraseña ha sido restablecida exitosamente")


@router.get("/me", response_model=MePostulanteRespuesta)
async def obtener_perfil_me(
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> MePostulanteRespuesta:
    """Devuelve los datos de la sesión del postulante y su fecha de última modificación de clave."""
    consulta = (
        select(Usuario)
        .options(joinedload(Usuario.postulante))
        .where(Usuario.id == x_usuario_id)
    )
    usuario = (await sesion.execute(consulta)).scalar_one_or_none()

    if usuario is None or usuario.estado != "Activo" or usuario.postulante is None:
        raise RecursoNoEncontrado("Usuario no encontrado o inactivo")

    p = usuario.postulante
    requiere_terminos = p.version_terminos_aceptados != VERSION_TERMINOS

    return MePostulanteRespuesta(
        usuarioId=usuario.id,
        postulanteId=p.id,
        email=usuario.email,
        nombres=p.nombres,
        apellidos=p.apellidos,
        nombreCompleto=f"{p.nombres} {p.apellidos}".strip(),
        documentoTipo=p.documento_tipo,
        documentoNumero=p.documento_numero,
        telefono=p.telefono,
        fechaNacimiento=p.fecha_nacimiento,
        direccion=p.direccion,
        resumenProfesional=p.resumen_profesional,
        formacionAcademica=p.formacion_academica,
        idiomas=p.idiomas,
        experiencia=p.experiencia,
        cv=await _cv_respuesta(sesion, p.id),
        requiereAceptarTerminos=requiere_terminos,
        versionTerminos=p.version_terminos_aceptados,
        passwordCambiadaEn=usuario.password_cambiada_en,
    )


@router.patch("/me/perfil", response_model=MePostulanteRespuesta)
async def actualizar_perfil_me(
    datos: PerfilActualizarEntrada,
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion),
) -> MePostulanteRespuesta:
    """Permite al postulante actualizar sus propios datos de perfil."""
    consulta = (
        select(Usuario)
        .options(joinedload(Usuario.postulante))
        .where(Usuario.id == x_usuario_id)
    )
    usuario = (await sesion.execute(consulta)).scalar_one_or_none()

    if usuario is None or usuario.estado != "Activo" or usuario.postulante is None:
        raise RecursoNoEncontrado("Usuario no encontrado o inactivo")

    p = usuario.postulante
    cambios = datos.model_dump(exclude_unset=True)

    # Mapeo de camelCase a snake_case
    mapeo = {
        "nombres": "nombres",
        "apellidos": "apellidos",
        "documentoTipo": "documento_tipo",
        "documentoNumero": "documento_numero",
        "telefono": "telefono",
        "fechaNacimiento": "fecha_nacimiento",
        "direccion": "direccion",
        "resumenProfesional": "resumen_profesional",
        "formacionAcademica": "formacion_academica",
        "idiomas": "idiomas",
        "experiencia": "experiencia",
    }

    for campo_json, campo_db in mapeo.items():
        if campo_json in cambios:
            setattr(p, campo_db, cambios[campo_json])

    await sesion.commit()
    
    requiere_terminos = p.version_terminos_aceptados != VERSION_TERMINOS
    return MePostulanteRespuesta(
        usuarioId=usuario.id,
        postulanteId=p.id,
        email=usuario.email,
        nombres=p.nombres,
        apellidos=p.apellidos,
        nombreCompleto=f"{p.nombres} {p.apellidos}".strip(),
        documentoTipo=p.documento_tipo,
        documentoNumero=p.documento_numero,
        telefono=p.telefono,
        fechaNacimiento=p.fecha_nacimiento,
        direccion=p.direccion,
        resumenProfesional=p.resumen_profesional,
        formacionAcademica=p.formacion_academica,
        idiomas=p.idiomas,
        experiencia=p.experiencia,
        cv=await _cv_respuesta(sesion, p.id),
        requiereAceptarTerminos=requiere_terminos,
        versionTerminos=p.version_terminos_aceptados,
        passwordCambiadaEn=usuario.password_cambiada_en,
    )


@router.post("/aceptar-terminos", response_model=MensajeRespuesta)
async def aceptar_terminos_vigentes(
    datos: AceptarTerminosEntrada,
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion),
) -> MensajeRespuesta:
    """Registra la aceptación de la versión vigente de términos y política de privacidad."""
    usuario = await sesion.get(Usuario, x_usuario_id)
    if usuario is None or usuario.estado != "Activo":
        raise RecursoNoEncontrado("Usuario no encontrado")

    postulante = await sesion.get(Postulante, usuario.postulante_id)
    if postulante is None:
        raise RecursoNoEncontrado("Postulante no encontrado")

    ahora = datetime.now(timezone.utc)
    postulante.version_terminos_aceptados = datos.version
    postulante.ip_aceptacion = datos.ip
    postulante.fecha_aceptacion_consentimiento = ahora
    postulante.consentimiento_tratamiento_datos = True

    await sesion.commit()
    return MensajeRespuesta(mensaje="Términos y condiciones aceptados correctamente")


# ---------------------------------------------------------------------------
# CV del propio postulante (app ANUNCIOS)
# ---------------------------------------------------------------------------
# El postulante solo ve y gestiona su documento de tipo "CV". Los demás tipos
# (DNI, CERTIFICADO, OTRO) son internos del ERP y nunca se exponen aquí.
# Es el MISMO registro de la tabla `documentos` que ve RRHH en el ERP: si RRHH
# le subió un CV, el postulante lo ve en su perfil, y viceversa.
_TIPO_CV = "CV"


async def _postulante_activo(sesion: AsyncSession, usuario_id: str) -> Postulante:
    """Devuelve el postulante de la cuenta (404 si no existe o no está activa)."""
    usuario = await sesion.get(Usuario, usuario_id)
    if usuario is None or usuario.estado != "Activo" or usuario.postulante_id is None:
        raise RecursoNoEncontrado("Usuario no encontrado o inactivo")
    postulante = await sesion.get(Postulante, usuario.postulante_id)
    if postulante is None:
        raise RecursoNoEncontrado("Postulante no encontrado")
    return postulante


async def _cv_actual(sesion: AsyncSession, postulante_id: str) -> Documento | None:
    """El CV más reciente del postulante que tenga un archivo real en el Storage."""
    consulta = (
        select(Documento)
        .where(
            Documento.postulante_id == postulante_id,
            Documento.tipo == _TIPO_CV,
            Documento.ruta_archivo.is_not(None),
        )
        .order_by(Documento.fecha_subida.desc())
        .limit(1)
    )
    return (await sesion.execute(consulta)).scalar_one_or_none()


def _cv_a_dict(documento: Documento) -> dict:
    """Formato que espera ANUNCIOS (CurriculumAdjunto, sin la url: la arma el frontend)."""
    return {
        "nombreArchivo": documento.nombre_archivo,
        "tamanioKb": round((documento.tamano_bytes or 0) / 1024),
        "fechaCarga": documento.fecha_subida.isoformat(),
    }


async def _cv_respuesta(sesion: AsyncSession, postulante_id: str) -> dict | None:
    documento = await _cv_actual(sesion, postulante_id)
    return _cv_a_dict(documento) if documento else None


@router.post("/me/cv", status_code=status.HTTP_201_CREATED)
async def subir_cv_me(
    archivo: UploadFile = File(...),
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion),
) -> dict:
    """Sube el CV del postulante. Si ya tenía uno, lo reemplaza (un solo CV vigente)."""
    postulante = await _postulante_activo(sesion, x_usuario_id)

    # Se lee como máximo 1 byte más del límite: alcanza para saber que se pasó.
    contenido = await archivo.read(TAMANO_MAXIMO_BYTES + 1)
    validar_archivo(_TIPO_CV, archivo.content_type, len(contenido))

    # Se sube el archivo NUEVO primero; recién si salió bien se borra el viejo.
    subido = await subir_archivo(contenido, archivo.content_type, postulante.id)

    documento = await _cv_actual(sesion, postulante.id)
    ruta_anterior = documento.ruta_archivo if documento else None
    if documento is None:
        documento = Documento(postulante_id=postulante.id, tipo=_TIPO_CV)
        sesion.add(documento)

    documento.nombre_archivo = archivo.filename or "cv"
    documento.referencia_almacenamiento = f"{settings.supabase_bucket}/{subido.ruta}"
    documento.ruta_archivo = subido.ruta
    documento.tipo_contenido = subido.tipo_contenido
    documento.tamano_bytes = subido.bytes
    documento.fecha_subida = datetime.now(timezone.utc)
    await sesion.commit()

    await eliminar_archivo(ruta_anterior)
    return _cv_a_dict(documento)


@router.get("/me/cv/contenido")
async def obtener_cv_me(
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> Response:
    """Devuelve el archivo del CV para verlo en el navegador."""
    postulante = await _postulante_activo(sesion, x_usuario_id)
    documento = await _cv_actual(sesion, postulante.id)
    if documento is None:
        raise RecursoNoEncontrado("Aún no has subido tu CV")

    contenido, tipo_de_archivo = await descargar_archivo(documento.ruta_archivo)
    return Response(
        content=contenido,
        media_type=documento.tipo_contenido or tipo_de_archivo,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(documento.nombre_archivo)}"},
    )


@router.delete("/me/cv", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_cv_me(
    x_usuario_id: str = Header(...),
    sesion: AsyncSession = Depends(obtener_sesion),
) -> None:
    """Elimina el CV vigente del postulante (y su archivo del Storage)."""
    postulante = await _postulante_activo(sesion, x_usuario_id)
    documento = await _cv_actual(sesion, postulante.id)
    if documento is None:
        return
    ruta = documento.ruta_archivo
    await sesion.delete(documento)
    await sesion.commit()
    await eliminar_archivo(ruta)
