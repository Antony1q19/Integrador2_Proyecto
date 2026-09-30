"""Datos de prueba de postulantes (base de datos `postulantes_db`).

Solo se ejecuta en modo "desarrollo", al encender el servicio (ver main.py).
Inserta UN registro en cada tabla; es seguro ejecutarlo muchas veces: si el
registro ya existe se salta.

Los datos son ficticios (nunca uses datos personales reales en pruebas).
"""
from datetime import date

from sqlalchemy import select

from app.core.database import SessionLocal
from app.infrastructure.models import Documento, Postulante, Usuario
from shared_kernel.datos_prueba import (
    PASSWORD_PRUEBA,
    POSTULANTE_PRUEBA_EMAIL,
    POSTULANTE_PRUEBA_ID,
)
from shared_kernel.passwords import hash_password


async def sembrar_datos_de_prueba() -> None:
    async with SessionLocal() as sesion:
        # --- Tabla `postulantes` ---------------------------------------------
        # El id es fijo para que los seeds de los otros servicios (por ejemplo,
        # la postulación de prueba) puedan apuntar a este postulante.
        postulante = await sesion.get(Postulante, POSTULANTE_PRUEBA_ID)
        if postulante is None:
            sesion.add(
                Postulante(
                    id=POSTULANTE_PRUEBA_ID,
                    nombres="Postulante",
                    apellidos="de Prueba",
                    documento_tipo="DNI",
                    documento_numero="70000001",
                    email=POSTULANTE_PRUEBA_EMAIL,
                    telefono="+51 900 000 001",
                    cargo_postulado="Desarrollador Full Stack Senior",
                    empresa_cliente="Consultora Andina S.A.C.",
                    fecha_nacimiento=date(1998, 5, 20),
                    direccion="Av. Los Olivos 123, Lima",
                    fuente_reclutamiento="Bolsa de trabajo",
                    formacion_academica=[
                        {"institucion": "Universidad de Prueba", "titulo": "Ing. de Sistemas", "anioFin": 2022}
                    ],
                    idiomas=[{"idioma": "Inglés", "nivel": "Intermedio"}],
                    experiencia=[
                        {"empresa": "Empresa de Prueba S.A.", "cargo": "Desarrollador", "fechaInicio": "2022-03"}
                    ],
                    consentimiento_tratamiento_datos=True,
                    consentimiento_comunicaciones_comerciales=False,
                )
            )

        # --- Tabla `documentos` ----------------------------------------------
        hay_documentos = await sesion.execute(
            select(Documento).where(Documento.postulante_id == POSTULANTE_PRUEBA_ID)
        )
        if hay_documentos.first() is None:
            sesion.add(
                Documento(
                    postulante_id=POSTULANTE_PRUEBA_ID,
                    tipo="CV",
                    nombre_archivo="cv-postulante-prueba.pdf",
                    referencia_almacenamiento="prueba/cv-postulante-prueba.pdf",
                )
            )

        # --- Tabla `usuarios` (cuenta de acceso del postulante) ---------------
        tiene_cuenta = await sesion.execute(
            select(Usuario).where(Usuario.postulante_id == POSTULANTE_PRUEBA_ID)
        )
        if tiene_cuenta.first() is None:
            sesion.add(
                Usuario(
                    postulante_id=POSTULANTE_PRUEBA_ID,
                    email=POSTULANTE_PRUEBA_EMAIL,
                    password_hash=hash_password(PASSWORD_PRUEBA),
                    estado="Activo",
                )
            )

        await sesion.commit()
