"""INTEROPERABILIDAD con Amazon S3 (documentos) — servicio-postulantes/app/infrastructure/storage.py.

Caso de la matriz: B1 (parte S3). Criterio de aceptación: los archivos se guardan con su tipo MIME
correcto y una ruta única por postulante, se recuperan byte a byte idénticos, y cualquier problema
con S3 se informa como "servicio no disponible" (nunca como un error 500).
"""
import pytest

from app.core.config import settings
from app.infrastructure import storage
from shared_kernel.exceptions import ServicioNoDisponible

PDF = b"%PDF-1.7\n" + bytes(range(256)) * 4  # contenido binario: todos los valores de byte


@pytest.mark.parametrize(
    ("tipo", "extension"), [("application/pdf", ".pdf"), ("image/jpeg", ".jpg"), ("image/png", ".png")]
)
async def test_subir_guarda_el_tipo_mime_y_una_ruta_unica_por_postulante(s3, tipo, extension):
    subido = await storage.subir_archivo(PDF, tipo, "postulante-123")

    assert subido.ruta.startswith("postulante-123/") and subido.ruta.endswith(extension)
    assert (subido.tipo_contenido, subido.bytes) == (tipo, len(PDF))
    objeto = s3.cliente.head_object(Bucket=s3.bucket, Key=subido.ruta)
    assert objeto["ContentType"] == tipo


async def test_dos_subidas_del_mismo_archivo_no_se_pisan(s3):
    primero = await storage.subir_archivo(PDF, "application/pdf", "postulante-123")
    segundo = await storage.subir_archivo(PDF, "application/pdf", "postulante-123")

    assert primero.ruta != segundo.ruta


async def test_descargar_devuelve_el_archivo_identico_y_su_tipo(s3):
    subido = await storage.subir_archivo(PDF, "application/pdf", "postulante-123")

    contenido, tipo = await storage.descargar_archivo(subido.ruta)

    assert contenido == PDF and tipo == "application/pdf"


async def test_eliminar_borra_el_objeto_del_bucket(s3):
    subido = await storage.subir_archivo(PDF, "application/pdf", "postulante-123")

    await storage.eliminar_archivo(subido.ruta)

    assert s3.cliente.list_objects_v2(Bucket=s3.bucket).get("KeyCount", 0) == 0


@pytest.mark.parametrize("ruta", [None, "postulante-123/no-existe.pdf"], ids=["sin-ruta", "inexistente"])
async def test_eliminar_algo_que_no_esta_no_rompe(s3, ruta):
    await storage.eliminar_archivo(ruta)  # no lanza


async def test_descargar_un_archivo_inexistente_es_servicio_no_disponible(s3):
    with pytest.raises(ServicioNoDisponible, match="No se pudo obtener el archivo"):
        await storage.descargar_archivo("postulante-123/no-existe.pdf")


async def test_sin_bucket_configurado_se_avisa_claramente(s3, monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_documentos", "")

    with pytest.raises(ServicioNoDisponible, match="S3_BUCKET_DOCUMENTOS"):
        await storage.subir_archivo(PDF, "application/pdf", "postulante-123")


async def test_bucket_inexistente_solo_avisa_al_encender_y_falla_claro_al_subir(s3, monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_documentos", "bucket-que-no-existe")

    await storage.asegurar_bucket(5 * 1024 * 1024, {"application/pdf"})  # no impide que el servicio arranque
    with pytest.raises(ServicioNoDisponible, match="No se pudo guardar el archivo"):
        await storage.subir_archivo(PDF, "application/pdf", "postulante-123")
