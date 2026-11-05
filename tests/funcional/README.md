# Pruebas de Calidad de Software: Adecuación Funcional (ISO/IEC 25010) y V&V

Este directorio contiene la batería de pruebas de calidad de software orientadas a la característica **Adecuación Funcional (Functional Suitability)** según el estándar internacional **ISO/IEC 25010**, aplicando una metodología formal de **Verificación y Validación (V&V)** sobre el ERP de Selección y Reclutamiento de Talento (**TalentERP**).

---

## 1. Fundamentos Teóricos: Calidad Funcional y V&V

### 1.1 Subcaracterísticas de Adecuación Funcional (ISO/IEC 25010)

1. **Completitud Funcional (Functional Completeness):** Grado en que el conjunto de funcionalidades cubre todas las tareas y objetivos especificados por el usuario (registro de candidatos, publicación de vacantes, scoring de competencias, agenda de entrevistas, contratación y seguimiento post-ingreso).
2. **Corrección Funcional (Functional Correctness):** Grado en que las funciones proporcionan los resultados correctos con el nivel de precisión requerido (algoritmo de scoring HU-08, umbrales de aptitud APTO/NO_APTO, cálculo de fechas de seguimiento a 30/60/90 días, validación estricta de documentos DNI/CE/Pasaporte y límites de tamaño de archivos).
3. **Pertinencia Funcional (Functional Appropriateness):** Grado en que las funciones facilitan el logro de los objetivos del negocio evitando estados inconsistentes (idempotencia en postulaciones, máquina de estados con transiciones legales, no eliminación de empresas con anuncios activos, cumplimiento de la Ley N.º 29733 de Protección de Datos Personales).

### 1.2 Verificación y Validación (V&V)

- **Verificación ("¿Estamos construyendo el producto correctamente?"):**
  Comprueba la conformidad del software frente a las especificaciones técnicas, límites de datos y esquemas de diseño mediante:
  - **Análisis de Valores Límite (BVA):** Límites exactos de archivos (5 MB exacto, 5 MB + 1 byte, 0 bytes vacío), longitudes de documentos de identidad, salarios y números de vacantes.
  - **Partición de Equivalencia (EP):** Clasificación de entradas válidas e inválidas para teléfonos, correos y tipos de documentos.
  - **Inspección de Firmas Binarias (Magic Bytes):** Detección de archivos con extensiones falseadas (ejecutables o scripts camuflados como PDF o imágenes).
  - **Auditoría de Control de Acceso por Roles (RBAC):** Restricción técnica de mutaciones de estado a roles autorizados.
- **Validación ("¿Estamos construyendo el producto correcto?"):**
  Comprueba que el software satisface las necesidades operativas del usuario final, del negocio y el marco legal:
  - **Cumplimiento Legal (Ley N.º 29733):** Obligatoriedad del consentimiento para el postulante libre, y exención reglamentada para el reclutador administrativo de RRHH.
  - **Flujo Integral de Negocio (End-to-End):** Transición fluida desde la postulación hasta la contratación formal y el seguimiento de desempeño.
  - **Idempotencia y Unicidad:** Bloqueo de postulantes y postulaciones duplicadas.

---

## 2. Matriz de Trazabilidad de Requisitos (RTM)

| ID Requisito | Requerimiento / Historia | Técnica V&V | Suite / Archivo | Pruebas |
|---|---|---|---|:---:|
| **RF-01** | Registro de postulantes, verificación de identidad, BVA de CV (5 MB), Magic Bytes y consentimiento Ley 29733 | Verificación (BVA, Magic Bytes) + Validación legal | `test_funcional_postulantes.py` | 49 |
| **RF-02** | Pipeline de selección, evaluaciones por competencias (HU-08), umbral APTO/NO_APTO y máquina de estados | Verificación algorítmica + Transición de estados | `test_funcional_seleccion.py` | 40 |
| **RF-03** | Gestión de empresas clientes, validación de RUC (11 dígitos), vacantes y no eliminación con anuncios activos | Verificación de esquema + Validación de integridad | `test_funcional_empresas.py` | 28 |
| **RF-04** | Autenticación, política de contraseñas robustas, claves temporales, roles internos y rate limiting por IP | Verificación de seguridad + Pertinencia funcional | `test_funcional_gateway.py` | 30 |
| **RF-05** | Flujo operativo integral de selección y auditoría de reapertura/descarte con justificación obligatoria | Validación de negocio End-to-End | `test_validacion_negocio_flujos.py` | 3 |
| **RF-06** | Auditoría y control de regresión de seguridad RBAC en control de entrevistas (Remediación BUG-VNV-001) | Verificación de autorización RBAC | `test_auditoria_funcional_vyv.py` | 18 |
| **Total** | | | | **168** |

---

## 3. Estructura de Suites Funcionales

```
tests/funcional/
├── test_funcional_postulantes.py      ← BVA de CV, Magic Bytes, Ley 29733, DNI/CE/Pasaporte (49 tests)
├── test_funcional_seleccion.py        ← Máquina de estados, evaluaciones HU-08, hitos 30/60/90 (40 tests)
├── test_funcional_empresas.py         ← Esquemas RUC 11 dígitos, anuncios, integridad de eliminación (28 tests)
├── test_funcional_gateway.py          ← Política contraseñas, roles ERP, Rate Limiting 429 (30 tests)
├── test_validacion_negocio_flujos.py  ← Flujo integral E2E, descarte y reversión auditada (3 tests)
├── test_auditoria_funcional_vyv.py    ← Auditoría integral y regresión RBAC BUG-VNV-001 (18 tests)
└── README.md                          ← Documentación metodológica de calidad funcional y V&V
```

---

## 4. Defectos Reales Detectados y Remediados en V&V

### BUG-VNV-001: Sobre-autorización en Mutación de Entrevistas (RBAC)
- **Componente:** `backend/servicio-procesos-seleccion/app/api/v1/entrevistas.py` (línea 183).
- **Severidad:** 🔴 Alta (Seguridad y Regla de Negocio).
- **Descripción:** El endpoint `PATCH /entrevistas/{id}` incluía al rol `"Supervisor"` en `requerir_rol("Admin", "RRHH", "Supervisor")`. Esto violaba el criterio de aceptación que estipula que solo Administradores y personal de RRHH pueden alterar o cerrar el estado de una entrevista formal de selección.
- **Remediación:** Se actualizó la dependencia de autorización a `requerir_rol("Admin", "RRHH")`, manteniendo al Supervisor únicamente con permisos de lectura (`GET /entrevistas`). La prueba `test_rf03_verificacion_rbac_supervisor_no_debe_mutar_entrevistas` audita directamente el código fuente y verifica la estricta exclusión de roles indebidos.

---

## 5. Instrucciones de Ejecución

### 5.1 Ejecución individual mediante pytest

Desde la raíz del repositorio, activando el entorno virtual:

```powershell
# En PowerShell (Windows):
.\.venv\Scripts\Activate.ps1

# Postulantes y Ley 29733:
$env:PYTHONPATH="backend/servicio-postulantes;backend/libs/shared"
pytest tests/funcional/test_funcional_postulantes.py -v

# Procesos de Selección y Evaluaciones:
$env:PYTHONPATH="backend/servicio-procesos-seleccion;backend/libs/shared"
pytest tests/funcional/test_funcional_seleccion.py -v

# Empresas y Vacantes:
$env:PYTHONPATH="backend/servicio-empresas-vacantes;backend/libs/shared"
pytest tests/funcional/test_funcional_empresas.py -v

# Gateway y Seguridad:
$env:PYTHONPATH="backend/gateway;backend/libs/shared"
pytest tests/funcional/test_funcional_gateway.py -v

# Flujos de Negocio E2E:
$env:PYTHONPATH="backend/servicio-procesos-seleccion;backend/libs/shared"
pytest tests/funcional/test_validacion_negocio_flujos.py -v

# Auditoría V&V integral:
$env:PYTHONPATH="backend/servicio-postulantes;backend/libs/shared"
pytest tests/funcional/test_auditoria_funcional_vyv.py -v
```

### 5.2 Ejecución consolidada mediante el Runner Central

Las suites funcionales están integradas en `tests/ejecutar.py`. Para correr toda la adecuación funcional de una sola vez y generar reportes JUnit XML en `tests/evidencias/` junto al reporte Markdown:

```powershell
python tests/ejecutar.py funcional-postulantes funcional-seleccion funcional-empresas funcional-gateway funcional-flujos funcional-auditoria-vyv
```

El resumen consolidado se guarda automáticamente en `tests/evidencias/resumen.md`.
