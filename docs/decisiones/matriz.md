# Gestión de Riesgos - Laboratorio 3

## 1. Matriz de Evaluación de Riesgos (5x5)

**Fórmula:** $\text{Probabilidad} \times \text{Impacto} = \text{Nivel de riesgo}$

| Probabilidad \ Impacto | 1 - Muy Bajo | 2 - Bajo | 3 - Moderado | 4 - Mayor | 5 - Crítico |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **5 - Muy Alta** | | | | | |
| **4 - Alta** | | | | **R-02** | |
| **3 - Media** | | | **R-04** | **R-05, R-07, R-08, R-09** | |
| **2 - Baja** | | | **R-06** | | **R-03** |
| **1 - Muy Baja** | | | | | |

---

## 2. Tabla Registro de Riesgos

| ID | Riesgo | Categoría | Probabilidad | Impacto | Resultado | Nivel | Solución / Plan de Mitigación |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **R-02** | Muchas historias pendientes pueden comprometer el Sprint Goal | Calendario y equipo | 4 | 4 | 16 | 🔴 Alto | Priorizar backlog, limitar tareas en progreso (WIP) y revisar el Sprint Goal diariamente. |
| **R-03** | Uso accidental de datos personales en pruebas | Seguridad y privacidad | 2 | 5 | 10 | 🔴 Alto | Utilizar datos sintéticos / anonimizados y revisar rigurosamente los Pull Requests. |
| **R-05** | Usuarios con teclado podrían no utilizar correctamente la interfaz | UX y accesibilidad | 3 | 4 | 12 | 🔴 Alto | Usar controles HTML nativos, implementar `:focus-visible` y verificar la navegación con TAB. |
| **R-07** | Microservicios pueden aumentar complejidad de integración | Arquitectura y tecnología | 3 | 4 | 12 | 🔴 Alto | Documentar la arquitectura, utilizar Docker Compose para entornos locales y definir responsabilidades claras. |
| **R-08** | APIs con contratos diferentes entre Front-End y Back-End | Datos e integración | 3 | 4 | 12 | 🔴 Alto | Documentar APIs con OpenAPI/Swagger y compartir interfaces/tipos TypeScript entre proyectos. |
| **R-09** | Fallos en GitHub Actions y CI/CD | Infraestructura | 3 | 4 | 12 | 🔴 Alto | Configurar correctamente GitHub Actions y ejecutar automáticamente tareas de `build` y `lint`. |
| **R-04** | Diseño no adaptable a pantallas pequeñas | UX | 3 | 3 | 9 | 🟡 Moderado | Diseñar con enfoque Mobile First y utilizar clases responsivas de Tailwind CSS. |
| **R-06** | Diferentes versiones de Node.js entre integrantes | Infraestructura | 2 | 3 | 6 | 🟡 Moderado | Definir una versión estándar de Node.js (vía `.nvmrc`) y documentar el proceso de instalación. |


