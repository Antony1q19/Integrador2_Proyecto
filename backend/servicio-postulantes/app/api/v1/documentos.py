"""Endpoints de documentos de un postulante (HU-06: subir/reemplazar)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion
from app.infrastructure.models import Documento, Postulante
from app.schemas.documento import DocumentoCrear, DocumentoRespuesta
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/postulantes/{postulante_id}/documentos", tags=["documentos"])


@router.get("", response_model=list[DocumentoRespuesta])
async def listar_documentos(
    postulante_id: str, sesion: AsyncSession = Depends(obtener_sesion)
) -> list[DocumentoRespuesta]:
    resultado = await sesion.execute(
        select(Documento).where(Documento.postulante_id == postulante_id)
    )
    return list(resultado.scalars().all())


@router.post("", response_model=DocumentoRespuesta, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    postulante_id: str,
    datos: DocumentoCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> DocumentoRespuesta:
    postulante = await sesion.get(Postulante, postulante_id)
    if postulante is None:
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")

    documento = Documento(
        postulante_id=postulante_id,
        tipo=datos.tipo,
        nombre_archivo=datos.nombreArchivo,
        referencia_almacenamiento=datos.referenciaAlmacenamiento,
    )
    sesion.add(documento)
    await sesion.commit()
    await sesion.refresh(documento)
    return documento


@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_documento(
    postulante_id: str,
    documento_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> None:
    documento = await sesion.get(Documento, documento_id)
    if documento is None or documento.postulante_id != postulante_id:
        raise RecursoNoEncontrado(f"Documento {documento_id} no encontrado")
    await sesion.delete(documento)
    await sesion.commit()
