"""Datos de prueba de procesos de selección (base de datos `procesos_seleccion_db`).

Solo se ejecuta en modo "desarrollo", al encender el servicio (ver main.py).
Inserta UN registro en cada tabla; es seguro ejecutarlo muchas veces: si ya
existe, se salta.

La postulación de prueba apunta al postulante de prueba (servicio-postulantes) y
al anuncio de prueba (servicio-empresas-vacantes) usando los ids compartidos de
shared_kernel/datos_prueba.py.

Los datos son ficticios.
"""
from sqlalchemy import select

from app.core.database import SessionLocal
from app.infrastructure.models import Evaluacion, HistorialEstado, ProcesoPostulacion
from shared_kernel.datos_prueba import ANUNCIO_PRUEBA_ID, POSTULANTE_PRUEBA_ID


async def sembrar_datos_de_prueba() -> None:
    async with SessionLocal() as sesion:
        # --- Tabla `procesos_postulacion` -------------------------------------
        resultado = await sesion.execute(
            select(ProcesoPostulacion).where(
                ProcesoPostulacion.postulante_id == POSTULANTE_PRUEBA_ID,
                ProcesoPostulacion.anuncio_id == ANUNCIO_PRUEBA_ID,
            )
        )
        proceso = resultado.scalar_one_or_none()
        if proceso is None:
            proceso = ProcesoPostulacion(
                postulante_id=POSTULANTE_PRUEBA_ID,
                anuncio_id=ANUNCIO_PRUEBA_ID,
                estado_actual="POSTULADO",
            )
            sesion.add(proceso)
            # flush = "envía ya la fila a la base" (sin confirmar todavía), para
            # que la postulación tenga su id antes de crear su historial.
            await sesion.flush()

        # --- Tabla `historial_estados` ----------------------------------------
        hay_historial = await sesion.execute(
            select(HistorialEstado).where(HistorialEstado.proceso_id == proceso.id)
        )
        if hay_historial.first() is None:
            sesion.add(
                HistorialEstado(
                    proceso_id=proceso.id,
                    estado="POSTULADO",
                    usuario_responsable="Xavier Ibarra",
                    comentario="Postulación de prueba (seed)",
                )
            )

        # --- Tabla `evaluaciones` ----------------------------------------------
        hay_evaluaciones = await sesion.execute(
            select(Evaluacion).where(Evaluacion.postulante_id == POSTULANTE_PRUEBA_ID)
        )
        if hay_evaluaciones.first() is None:
            sesion.add(
                Evaluacion(
                    postulante_id=POSTULANTE_PRUEBA_ID,
                    evaluador="Xavier Ibarra",
                    # 6 competencias en 4 → promedio 4 de 5 → 80 puntos → APTO (desde 70).
                    comunicacion_efectiva=4,
                    orientacion_cliente=4,
                    responsabilidad=4,
                    adaptabilidad_flexibilidad=4,
                    tolerancia_presion=4,
                    dinamismo_energia=4,
                    puntaje_total=80,
                    resultado="APTO",
                    comentarios="Evaluación de prueba (seed)",
                )
            )

        await sesion.commit()
