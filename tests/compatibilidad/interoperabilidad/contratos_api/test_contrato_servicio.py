"""INTEROPERABILIDAD interna — contrato OpenAPI de UN servicio (C1).

tests/ejecutar.py corre este archivo una vez por servicio (variable CONTRATO_SERVICIO), con el código
de ese servicio en el PYTHONPATH. El esquema OpenAPI se genera desde el código (no se publica en
producción) y se compara con el contrato aprobado en contratos/<servicio>.json.

Criterio de aceptación: el contrato es un OpenAPI 3 válido, sin operationId repetidos, y no cambia sin
que el equipo lo apruebe. Si el cambio es intencional:  python tests/ejecutar.py --actualizar-contratos
"""
import importlib
import json
import os
from pathlib import Path

import pytest
from openapi_spec_validator import validate

SERVICIO = os.environ.get("CONTRATO_SERVICIO")
CONTRATOS = Path(__file__).parent / "contratos"
METODOS = {"get", "post", "put", "patch", "delete"}

pytestmark = pytest.mark.skipif(not SERVICIO, reason="lo ejecuta tests/ejecutar.py, una vez por servicio")


@pytest.fixture(scope="module")
def esquema() -> dict:
    app = importlib.import_module("app.main").app
    return json.loads(json.dumps(app.openapi()))  # copia "pura" (solo tipos JSON)


@pytest.fixture(scope="module")
def contrato_aprobado(esquema) -> dict:
    archivo = CONTRATOS / f"{SERVICIO}.json"
    if os.environ.get("ACTUALIZAR_CONTRATOS") == "1":
        CONTRATOS.mkdir(exist_ok=True)
        archivo.write_text(json.dumps(esquema, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    if not archivo.exists():
        pytest.fail(f"Falta {archivo.name}: genera los contratos con  python tests/ejecutar.py --actualizar-contratos")
    return json.loads(archivo.read_text(encoding="utf-8"))


def _resolver(esquema: dict, nodo: dict) -> dict:
    while "$ref" in nodo:
        nodo = esquema["components"]["schemas"][nodo["$ref"].rsplit("/", 1)[-1]]
    return nodo


def firma(esquema: dict) -> dict[str, dict]:
    """Lo que un consumidor necesita que NO cambie: operaciones, parámetros obligatorios, campos
    obligatorios del cuerpo y códigos de respuesta. (Las descripciones pueden cambiar libremente.)"""
    resultado = {}
    for ruta, operaciones in esquema.get("paths", {}).items():
        for metodo, operacion in operaciones.items():
            if metodo not in METODOS:
                continue
            obligatorios = sorted(f"{p['in']}:{p['name']}" for p in operacion.get("parameters", []) if p.get("required"))
            cuerpo = {}
            for tipo, contenido in (operacion.get("requestBody") or {}).get("content", {}).items():
                cuerpo[tipo] = sorted(_resolver(esquema, contenido.get("schema", {})).get("required", []))
            resultado[f"{metodo.upper()} {ruta}"] = {
                "parametros_obligatorios": obligatorios,
                "cuerpo_obligatorio": cuerpo,
                "respuestas": sorted(operacion.get("responses", {})),
            }
    return resultado


def test_el_contrato_es_un_openapi_3_valido(esquema):
    validate(esquema)
    assert esquema["openapi"].startswith("3.")


def test_no_hay_operation_id_repetidos(esquema):
    """Los generadores de clientes (Postman, Schemathesis, SDKs) necesitan operationId únicos."""
    ids = [op["operationId"] for ops in esquema["paths"].values() for m, op in ops.items() if m in METODOS]
    repetidos = sorted({i for i in ids if ids.count(i) > 1})
    assert not repetidos, f"operationId repetidos: {repetidos}"


def test_el_contrato_no_cambio_sin_aprobacion(esquema, contrato_aprobado):
    actual, aprobado = firma(esquema), firma(contrato_aprobado)
    nuevas = sorted(set(actual) - set(aprobado))
    eliminadas = sorted(set(aprobado) - set(actual))
    cambiadas = sorted(op for op in set(actual) & set(aprobado) if actual[op] != aprobado[op])
    assert not (nuevas or eliminadas or cambiadas), (
        f"El contrato de {SERVICIO} cambió.\n  Nuevas: {nuevas}\n  Eliminadas: {eliminadas}\n  Cambiadas: {cambiadas}\n"
        "Si es intencional, revisa a los consumidores y ejecuta:  python tests/ejecutar.py --actualizar-contratos"
    )
