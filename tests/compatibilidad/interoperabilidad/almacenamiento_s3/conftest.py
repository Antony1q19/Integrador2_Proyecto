"""Amazon S3 simulado con moto: se usa la API real de boto3 (put/get/delete_object) sin tocar AWS."""
from types import SimpleNamespace

import boto3
import pytest
from moto import mock_aws

from app.core.config import settings
from app.infrastructure import storage


@pytest.fixture
def s3(monkeypatch):
    """Un bucket privado como el de producción, configurado en el servicio."""
    datos = SimpleNamespace(bucket="talenterp-documentos-prueba")
    with mock_aws():
        datos.cliente = boto3.client("s3", region_name="us-east-1")
        datos.cliente.create_bucket(Bucket=datos.bucket)
        monkeypatch.setattr(settings, "s3_bucket_documentos", datos.bucket)
        monkeypatch.setattr(storage, "_cliente_s3", None)  # cliente nuevo dentro del simulador
        yield datos
