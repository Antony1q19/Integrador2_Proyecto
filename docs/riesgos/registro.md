# Registro de riesgos — ERP de Reclutamiento

> Actualiza esta tabla en cada revisión (ver cadencia en `plan.md`). Para riesgos
> Altos o Críticos, crea también un issue con la plantilla "Riesgo" y enlázalo aquí.

| ID | Riesgo (causa - evento - impacto) | Categoría | P | I | P×I | Nivel | Dueño | Estado | Issue |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Debido a que la validación de duplicados aún es solo del Front-End (sin Back-End), dos reclutadores podrían registrar al mismo postulante desde equipos distintos. | Datos e integración | 4 | 5 | 20 | Crítico | Jefatura de proyecto | Respuesta planificada | #_ |
| R-02 | Debido al número de historias pendientes, el equipo podría intentar construir demasiado a la vez y comprometer el Sprint Goal. | Calendario y equipo | 4 | 4 | 16 | Alto | Product Owner | En tratamiento | #_ |
| R-03 | Debido al uso de ejemplos reales durante las pruebas, podrían incorporarse datos personales o secretos al repositorio. | Seguridad y privacidad | 2 | 5 | 10 | Alto | Calidad | En tratamiento | #_ |
| R-04 | Debido a anchos fijos en el listado, el diseño podría perder información en pantallas pequeñas. | UX y accesibilidad | 3 | 3 | 9 | Moderado | Diseño de componentes | En tratamiento | #_ |
| R-05 | Debido a tarjetas personalizadas, usuarios de teclado podrían no percibir el foco o activar el resultado. | UX y accesibilidad | 3 | 4 | 12 | Alto | Calidad y accesibilidad | En tratamiento | #_ |
| R-06 | Debido a versiones distintas de Node.js entre integrantes, la instalación podría fallar y retrasar la integración. | Infraestructura y despliegue | 2 | 3 | 6 | Moderado | Integración Front-End | Monitoreo | #_ |
| R-07 | Debido a que el Back-End se divide en varios microservicios (postulantes, empresas/vacantes, procesos de selección) en lugar de un único monolito, podría aumentar la sobrecarga operativa (más contenedores, más `Dockerfile`, más configuración) y retrasar la primera integración funcional del Sprint 2. | Arquitectura y tecnología | 3 | 4 | 12 | Alto | Jefatura de proyecto | En tratamiento | #_ |
| R-08 | Debido a que cada microservicio expone su propia API y esquema de datos, podrían surgir contratos inconsistentes entre servicios (o entre un servicio y el Gateway) si no se documentan con OpenAPI desde el inicio, provocando errores de integración difíciles de rastrear. | Datos e integración | 3 | 4 | 12 | Alto | Integración Back-End | En tratamiento | #_ |

## Cómo agregar un riesgo nuevo

1. Formúlalo con la plantilla: "Debido a [causa], podría ocurrir [evento], provocando [impacto]."
2. Clasifícalo con una categoría de la RBS (`plan.md`).
3. Puntúa probabilidad e impacto con las escalas del plan; calcula P×I y el nivel.
4. Si es Alto o Crítico, crea un issue con la plantilla "Riesgo", asígnale dueño y disparador, y enlázalo en la columna Issue.
5. Revisa y actualiza el estado en cada cadencia definida en el plan.
