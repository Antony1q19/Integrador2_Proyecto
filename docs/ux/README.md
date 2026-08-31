# UX — Flujo de postulantes

- **Prototipo (Figma):** _pega aquí el enlace de tu archivo de Figma_
- **Historia base:** Como reclutador, quiero buscar un postulante existente o
  registrar uno nuevo, para incorporarlo rápidamente a un proceso de selección
  sin duplicar información (HU-04 + HU-05).

## Inventario de pantallas y estados

| ID | Pantalla / componente | Estado principal | Estados que deben diseñarse | Trazabilidad |
|---|---|---|---|---|
| UX-01 | Inicio de sesión | Formulario listo | Vacío, cargando, credenciales inválidas | HU-001/CA-01 |
| UX-02 | Listado de postulantes | Tabla con buscador | Vacío, con resultados, sin resultados, cargando | HU-04/CA-01 |
| UX-03 | Filtros de búsqueda | Panel de filtros | Aplicado, limpiado, sin coincidencias | HU-04/CA-02, CA-03 |
| UX-04 | Registro de nuevo postulante | Formulario de datos | Vacío, incompleto, duplicado, guardando | HU-05/CA-01, CA-02, CA-03 |
| UX-05 | Confirmación de registro | Resumen antes de guardar | Pendiente de confirmar, confirmado | HU-05/CA-01 |
| UX-06 | Resultado / ficha del postulante | Registro creado | Éxito, error recuperable, reintento | HU-07/CA-01 |

Actualiza esta tabla cada vez que agregues una pantalla nueva al prototipo o al
Front-End, para poder rastrear cualquier componente hasta su historia y criterio.
