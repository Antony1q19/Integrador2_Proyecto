"""Datos de prueba de empresas y vacantes (base de datos `empresas_vacantes_db`).

Solo se ejecuta en modo "desarrollo", al encender el servicio (ver main.py).
Inserta UN registro en cada tabla, pero solo si la tabla está vacía; es seguro
ejecutarlo muchas veces.

Los ids de estas tablas los asigna la base de datos (1, 2, 3...). En una base
nueva, la primera empresa recibe el id 1 y el primer anuncio también el id 1;
los seeds de otros servicios cuentan con eso (ver shared_kernel/datos_prueba.py).

Los datos son ficticios.
"""
from datetime import date, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.infrastructure.models import Anuncio, Empresa


async def sembrar_datos_de_prueba() -> None:
    async with SessionLocal() as sesion:
        # --- Tabla `empresas` ------------------------------------------------
        hay_empresas = await sesion.execute(select(Empresa).limit(1))
        if hay_empresas.first() is None:
            sesion.add(
                Empresa(
                    razon_social="Consultora Andina S.A.C.",
                    ruc="20481234567",
                    contacto_nombre="María Gutiérrez",
                    contacto_email="mgutierrez@andina.example.com",
                    contacto_telefono="+51 987 654 321",
                    sector="Tecnología",
                )
            )
            # flush = "envía ya la fila a la base" (sin confirmar todavía), para
            # que la empresa exista y reciba su id antes de crear el anuncio.
            await sesion.flush()

        # --- Tabla `anuncios` --------------------------------------------------
        hay_anuncios = await sesion.execute(select(Anuncio).limit(1))
        if hay_anuncios.first() is None:
            empresa = (await sesion.execute(select(Empresa).order_by(Empresa.id).limit(1))).scalar_one()
            sesion.add(
                Anuncio(
                    empresa_id=empresa.id,
                    cargo="Desarrollador Full Stack Senior",
                    descripcion="Anuncio de prueba: desarrollo de aplicaciones web con Next.js y FastAPI.",
                    requisitos="3+ años de experiencia, TypeScript, Python, PostgreSQL.",
                    numero_vacantes=2,
                    salario_min=6000,
                    salario_max=9000,
                    fecha_limite=date.today() + timedelta(days=60),
                    estado="Abierto",
                )
            )

        await sesion.commit()
