# Plan de gestión de riesgos — ERP de Reclutamiento

| Elemento | Decisión del equipo |
|---|---|
| **Objetivo y alcance** | Proteger el Sprint Goal vigente y la calidad del incremento; cubre entorno, repositorio, prototipo y código. |
| **Método** | Identificación grupal guiada por la RBS, análisis cualitativo con matriz 5x5, tratamiento con dueño y disparador, seguimiento en cada reunión del equipo. |
| **Categorías (RBS)** | Negocio y valor · Alcance y requerimientos · Calendario y equipo · Arquitectura y tecnología · Datos e integración · Seguridad y privacidad · UX y accesibilidad · Calidad y pruebas · Infraestructura y despliegue · Operación y soporte. |
| **Escalas** | Probabilidad e impacto de 1 a 5. Exposición = P x I. |
| **Umbrales** | 1-4 Bajo (monitorear) · 5-9 Moderado (dueño y respuesta proporcional) · 10-16 Alto (acción priorizada, revisión semanal) · 17-25 Crítico (actuar antes de continuar, escalar de inmediato). |
| **Roles** | Dueño del riesgo: jefatura de proyecto. Dueño de acción: quien ejecuta la tarea. Aprobador: Product Owner. |
| **Cadencia** | Planificación del Sprint, cada daily breve y antes de cada hito (APF1/APF2/APF3). |
| **Registro y evidencia** | `docs/riesgos/registro.md`, más un issue con la etiqueta `riesgo` para cada riesgo Alto o Crítico. |
| **Reserva** | Un día de trabajo por integrante reservado antes del cierre del Sprint. |
| **Comunicación** | Los riesgos Altos y Críticos se reportan al Product Owner / docente en la sustentación semanal. |

## Escala de probabilidad

| Valor | Etiqueta | Criterio |
|---|---|---|
| 1 | Rara | Solo ocurriría bajo condiciones excepcionales; no hay señales actuales. |
| 2 | Improbable | Puede ocurrir, pero los controles y antecedentes indican baja posibilidad. |
| 3 | Posible | Existe una causa creíble o señales parciales. |
| 4 | Probable | Hay antecedentes, dependencia activa o señales claras. |
| 5 | Casi segura | Se espera que ocurra si no se actúa. |

## Escala de impacto

| Valor | Nivel | Criterio |
|---|---|---|
| 1 | Insignificante | Ajuste local menor; no afecta el Sprint Goal. |
| 2 | Menor | Retrabajo limitado, absorbible sin mover una entrega. |
| 3 | Moderado | Afecta una historia, criterio o fecha interna. |
| 4 | Mayor | Compromete el Sprint Goal o una característica crítica. |
| 5 | Severo | Impide un hito o expone datos/usuarios a daño significativo. |
