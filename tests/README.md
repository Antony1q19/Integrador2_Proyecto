# Pruebas de compatibilidad (ISO/IEC 25010)

Pruebas de la característica **Compatibilidad** de TalentERP y sus dos subcaracterísticas:

- **Interoperabilidad**: el sistema intercambia información correctamente con otros sistemas
  (Meta WhatsApp, Amazon SES, Amazon S3) y entre sus propias piezas (frontends ↔ Gateway ↔ microservicios).
- **Co-existencia**: los 7 servicios comparten red, base de datos y cuenta de AWS, y el ERP y el
  portal comparten el Gateway, sin perjudicarse entre sí.

Las pruebas unitarias de cada servicio siguen en `backend/<servicio>/tests/`. Aquí van las que
cruzan límites: con terceros, entre servicios y sobre la infraestructura compartida.

> Plan completo, resultados y matriz de hallazgos: [docs/calidad/plan-pruebas-compatibilidad.md](../docs/calidad/plan-pruebas-compatibilidad.md)
> y [docs/calidad/matriz-hallazgos.md](../docs/calidad/matriz-hallazgos.md).

## Estructura

```
tests/
├── ejecutar.py                 ← corre todas las suites y guarda la evidencia
├── requirements.txt
├── evidencias/                 ← reportes JUnit + resumen.md (lo genera ejecutar.py; git lo ignora)
├── funcional/                  ← Adecuación Funcional (ISO/IEC 25010) y Verificación y Validación (V&V)
│   ├── test_funcional_postulantes.py
│   ├── test_funcional_seleccion.py
│   ├── test_funcional_empresas.py
│   ├── test_funcional_gateway.py
│   ├── test_validacion_negocio_flujos.py
│   ├── test_auditoria_funcional_vyv.py
│   └── README.md
└── compatibilidad/
    ├── interoperabilidad/
    │   ├── meta_whatsapp/      A1, A3, A5 · WhatsApp Cloud API (respx)
    │   ├── correo_ses/         B1 · Amazon SES (moto)
    │   ├── almacenamiento_s3/  B1 · Amazon S3 (moto)
    │   └── contratos_api/      C1, C2 · contratos OpenAPI y llamadas de los frontends
    │       └── contratos/      ← contrato aprobado de cada servicio (.json)
    ├── coexistencia/
    │   ├── infraestructura_compartida/  E2, E6 · recursos, red, permisos (lee infra/aws)
    │   └── sesiones_erp_portal/         E4 · el ERP y el portal no mezclan sesiones
    └── navegadores/            D · Sprint 3 (Playwright)
```

Cada carpeta tiene un `README.md` con lo que prueba y, si aplica, los casos manuales de los
sprints siguientes.

## Cómo ejecutarlas

Requieren **Python 3.12** (la misma versión de las imágenes y del CI). En Windows, desde la raíz del proyecto:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r tests\requirements.txt

python tests\ejecutar.py                       # todas (≈ 30 s)
python tests\ejecutar.py meta-whatsapp         # una suite
python tests\ejecutar.py --listar              # nombres de las suites
```

- **No se conectan a nada real.** Meta se simula con `respx` y AWS con `moto`; `ejecutar.py` pone
  credenciales de AWS falsas, así que ninguna prueba puede tocar tu cuenta aunque tengas sesión iniciada.
- **Evidencia:** `tests/evidencias/<suite>.xml` (JUnit) y `tests/evidencias/resumen.md` con fecha y
  commit. En GitHub Actions (`ci-compatibilidad.yml`) se guardan como artefacto descargable.
- **Por qué un proceso por suite:** cada microservicio tiene su propio paquete `app`; `ejecutar.py` corre
  cada suite con el código de SU servicio.

## Contratos de API

`contratos_api/contratos/<servicio>.json` es el contrato **aprobado** de cada servicio (OpenAPI
generado desde el código; no se publica en producción). Si cambias una ruta a propósito:

```powershell
python tests\ejecutar.py --actualizar-contratos
```

y revisa en el diff de git qué cambió antes de hacer commit: si una ruta desaparece o pide un campo
nuevo, la suite `contrato-consumidores` dirá qué pantalla del ERP o del portal se rompe.

## Agregar una prueba

1. Ponla en la carpeta de su caso (o crea una nueva junto a las demás).
2. Si importa código de un servicio, agrega o reutiliza su `Suite` en `ejecutar.py` (campo `servicio`).
3. Nombra la prueba con lo que garantiza (`test_reintento_de_meta_no_duplica_el_mensaje`) y anota en el
   docstring el ID del caso (A1, B1, E4...) y su criterio de aceptación.
