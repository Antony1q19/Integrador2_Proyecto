"""Rutas de los documentos de un postulante (CV, DNI, certificados, imágenes...).

Rutas (todas cuelgan de un postulante). Los archivos se guardan en SUPABASE STORAGE (un bucket privado);
en nuestra base de datos solo queda la ruta del archivo y algunos datos suyos.
    GET     /postulantes/{id}/documentos                          → listar sus documentos
    GET     /postulantes/{id}/documentos/{documento_id}/contenido → el archivo en sí, para verlo o descargarlo
    POST    /postulantes/{id}/documentos/archivo                  → SUBIR un archivo nuevo   (Admin, RRHH, Supervisor)
    PUT     /postulantes/{id}/documentos/{documento_id}/archivo   → REEMPLAZAR el archivo    (Admin, RRHH, Supervisor)
    DELETE  /postulantes/{id}/documentos/{documento_id}           → eliminar (y borrar del Storage)
"""
from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.api.visibilidad import exigir_postulante_visible
from app.core.config import settings
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.postulantes import TAMANO_MAXIMO_BYTES, validar_archivo
from app.infrastructure.models import Documento, Postulante
from app.infrastructure.storage import descargar_archivo, eliminar_archivo, subir_archivo
from app.schemas.documento import DocumentoRespuesta
from shared_kernel.exceptions import RecursoNoEncontrado

# Todas las rutas de documentos exigen que el postulante sea visible para el usuario
# (RRHH/Supervisor no pueden tocar documentos de empresas que no tienen asignadas).
router = APIRouter(
    prefix="/postulantes/{postulante_id}/documentos",
    tags=["documentos"],
    dependencies=[Depends(exigir_postulante_visible)],
)

_ROLES_QUE_EDITAN = ("Admin", "RRHH", "Supervisor")


# ---------------------------------------------------------------------------
# Funciones de ayuda (uso interno de este archivo)
# ---------------------------------------------------------------------------
async def _exigir_postulante(sesion: AsyncSession, postulante_id: str) -> None:
    """Responde 404 si el postulante no existe."""
    if await sesion.get(Postulante, postulante_id) is None:
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")


async def _obtener_documento(sesion: AsyncSession, postulante_id: str, documento_id: str) -> Documento:
    """Busca un documento. Además de existir, debe pertenecer a ESE postulante (si no,
    alguien podría tocar un documento ajeno cambiando solo el id en la URL)."""
    documento = await sesion.get(Documento, documento_id)
    if documento is None or documento.postulante_id != postulante_id:
        raise RecursoNoEncontrado(f"Documento {documento_id} no encontrado")
    return documento


async def _leer_y_validar(archivo: UploadFile, tipo: str) -> bytes:
    """Lee el archivo recibido y comprueba tipo de documento, formato y tamaño."""
    # Se lee como máximo 1 byte más del límite: alcanza para saber que se pasó,
    # sin cargar en memoria un archivo enorme.
    contenido = await archivo.read(TAMANO_MAXIMO_BYTES + 1)
    validar_archivo(tipo, archivo.content_type, len(contenido))
    return contenido


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[DocumentoRespuesta])
async def listar_documentos(
    postulante_id: str, sesion: AsyncSession = Depends(obtener_sesion_lectura)
) -> list[DocumentoRespuesta]:
    resultado = await sesion.execute(
        select(Documento).where(Documento.postulante_id == postulante_id).order_by(Documento.fecha_subida)
    )
    return list(resultado.scalars().all())


# ---------------------------------------------------------------------------
# Ver / descargar el archivo
# ---------------------------------------------------------------------------
@router.get("/{documento_id}/contenido")
async def obtener_contenido_documento(
    postulante_id: str,
    documento_id: str,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol(*_ROLES_QUE_EDITAN)),
) -> Response:
    """Devuelve el archivo en sí (los bytes) para mostrarlo en el visor o descargarlo.

    El bucket es privado: el backend lo lee con su clave y lo entrega solo a quien tiene sesión y rol."""
    documento = await _obtener_documento(sesion, postulante_id, documento_id)
    if not documento.ruta_archivo:
        raise RecursoNoEncontrado("Este documento no tiene un archivo disponible")

    contenido, tipo_de_archivo = await descargar_archivo(documento.ruta_archivo)
    return Response(content=contenido, media_type=documento.tipo_contenido or tipo_de_archivo)


# ---------------------------------------------------------------------------
# Subir un archivo nuevo (a Supabase Storage)
# ---------------------------------------------------------------------------
@router.post("/archivo", response_model=DocumentoRespuesta, status_code=status.HTTP_201_CREATED)
async def subir_documento_archivo(
    postulante_id: str,
    tipo: str = Form(...),  # CV | DNI | CERTIFICADO | OTRO
    archivo: UploadFile = File(...),
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol(*_ROLES_QUE_EDITAN)),
) -> Documento:
    # PASO 1: el postulante debe existir y el archivo debe ser válido.
    await _exigir_postulante(sesion, postulante_id)
    contenido = await _leer_y_validar(archivo, tipo)

    # PASO 2: subir el archivo al bucket (carpeta propia de este postulante).
    subido = await subir_archivo(contenido, archivo.content_type, postulante_id)

    # PASO 3: guardar en la base de datos dónde quedó.
    documento = Documento(
        postulante_id=postulante_id,
        tipo=tipo,
        nombre_archivo=archivo.filename or "archivo",
        referencia_almacenamiento=f"{settings.supabase_bucket}/{subido.ruta}",
        ruta_archivo=subido.ruta,
        tipo_contenido=subido.tipo_contenido,
        tamano_bytes=subido.bytes,
    )
    sesion.add(documento)
    await sesion.commit()
    return documento


# ---------------------------------------------------------------------------
# Reemplazar el archivo de un documento
# ---------------------------------------------------------------------------
@router.put("/{documento_id}/archivo", response_model=DocumentoRespuesta)
async def reemplazar_documento_archivo(
    postulante_id: str,
    documento_id: str,
    archivo: UploadFile = File(...),
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol(*_ROLES_QUE_EDITAN)),
) -> Documento:
    documento = await _obtener_documento(sesion, postulante_id, documento_id)
    contenido = await _leer_y_validar(archivo, documento.tipo)

    # Se sube el archivo NUEVO primero; recién si eso salió bien, se borra el viejo.
    # Así, si el almacenamiento falla, el documento no se queda sin archivo.
    ruta_anterior = documento.ruta_archivo
    subido = await subir_archivo(contenido, archivo.content_type, postulante_id)

    documento.nombre_archivo = archivo.filename or "archivo"
    documento.referencia_almacenamiento = f"{settings.supabase_bucket}/{subido.ruta}"
    documento.ruta_archivo = subido.ruta
    documento.tipo_contenido = subido.tipo_contenido
    documento.tamano_bytes = subido.bytes
    await sesion.commit()

    await eliminar_archivo(ruta_anterior)
    return documento


# ---------------------------------------------------------------------------
# Eliminar
# ---------------------------------------------------------------------------
@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_documento(
    postulante_id: str,
    documento_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol(*_ROLES_QUE_EDITAN)),
) -> None:
    documento = await _obtener_documento(sesion, postulante_id, documento_id)
    ruta = documento.ruta_archivo

    await sesion.delete(documento)
    await sesion.commit()

    # Se borra del Storage DESPUÉS de confirmar el borrado en la base de datos.
    await eliminar_archivo(ruta)
