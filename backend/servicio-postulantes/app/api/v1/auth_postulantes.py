"""Rutas internas de autenticación y cuenta de postulantes.

Estas rutas son llamadas exclusivamente por el API Gateway mediante cabeceras
firmadas con HMAC (ver app/api/deps.py -> verificar_peticion_del_gateway).
"""
import hashlib
import secrets
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import verificar_peticion_del_gateway
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.postulantes import VERSION_TERMINOS, validar_consentimiento_obligatorio
from app.infrastructure.correo import enviar_correo_recuperacion
from app.infrastructure.models import Postulante, TokenRecuperacion, Usuario
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
