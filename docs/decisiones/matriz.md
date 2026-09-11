# Laboratorio 3 - Planificación Ágil y Arquitectura Front-End
------------------------------------------------------------------------

# 2. Arquitectura propuesta

## Arquitectura basada en microservicios

El sistema seguirá una arquitectura donde cada dominio tiene su propio
servicio independiente.

La idea es separar responsabilidades:

-   Microservicio de Front-End ERP
-   Microservicio de Front-End ANUNCIOS
-   Microservicios Back-End mediante APIs
-   Gateway de comunicación
-   Base de datos PostgreSQL

## Diseño por componentes

### components

### services

### hooks

### types

### utils

------------------------------------------------------------------------

# 3. Gestión de riesgos

Se utiliza una matriz 5x5:

Formula:

Probabilidad x Impacto = Nivel de riesgo

------------------------------------------------------------------------

# Tabla de riesgos

  ----------------------------------------------------------------------------------------------
  ID         Riesgo           Categoría         Probabilidad   Impacto    Resultado   Nivel
  ---------- ---------------- ----------------- -------------- ---------- ----------- ----------
  R-02       Muchas historias Calendario y      4              4          16          Alto
             pendientes       equipo                                                  
             pueden                                                                   
             comprometer el                                                           
             Sprint Goal                                                              

  R-05       Usuarios con     UX y              3              4          12          Alto
             teclado podrían  accesibilidad                                           
             no utilizar                                                              
             correctamente la                                                         
             interfaz                                                                 

  R-07       Microservicios   Arquitectura y    3              4          12          Alto
             pueden aumentar  tecnología                                              
             complejidad de                                                           
             integración                                                              

  R-08       APIs con         Datos e           3              4          12          Alto
             contratos        integración                                             
             diferentes entre                                                         
             Front-End y                                                              
             Back-End                                                                 

  R-03       Uso accidental   Seguridad y       2              5          10          Alto
             de datos         privacidad                                              
             personales en                                                            
             pruebas                                                                  

  R-09       Fallos en GitHub Infraestructura   3              4          12          Alto
             Actions y CI/CD                                                          

  R-04       Diseño no        UX                3              3          9           Moderado
             adaptable a                                                              
             pantallas                                                                
             pequeñas                                                                 

  R-06       Diferentes       Infraestructura   2              3          6           Moderado
             versiones de                                                             
             Node.js entre                                                            
             integrantes                                                              
  ----------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Explicación de cada riesgo

## R-02: Exceso de trabajo pendiente

Problema: El equipo puede iniciar muchas tareas y no terminar ninguna
correctamente.

Solución:

-   Priorizar backlog.
-   Limitar tareas en progreso.
-   Revisar Sprint Goal diariamente.

------------------------------------------------------------------------

## R-05: Accesibilidad

Problema: Usuarios que utilizan teclado podrían tener problemas.

Solución:

-   Usar controles HTML nativos.
-   Implementar focus-visible.
-   Revisar navegación con TAB.

------------------------------------------------------------------------

## R-07: Arquitectura microservicio

Problema: Separar servicios aumenta la complejidad.

Solución:

-   Documentar arquitectura.
-   Usar Docker Compose.
-   Definir responsabilidades claras.

------------------------------------------------------------------------

## R-08: Contratos API

Problema: Front-End y Back-End pueden manejar estructuras diferentes.

Solución:

-   Documentar APIs con OpenAPI/Swagger.
-   Mantener tipos compartidos.

------------------------------------------------------------------------

## R-03: Seguridad de datos

Problema: Datos reales pueden filtrarse al repositorio.

Solución:

-   Utilizar datos sintéticos.
-   Revisar Pull Requests.

------------------------------------------------------------------------

## R-09: CI/CD

Problema: El pipeline automático puede fallar.

Solución:

-   Configurar correctamente GitHub Actions.
-   Ejecutar build y lint automáticamente.

------------------------------------------------------------------------

## R-04: Responsive Design

Problema: La interfaz puede romperse en móviles.

Solución:

-   Diseño Mobile First.
-   Tailwind responsive.

------------------------------------------------------------------------

## R-06: Versiones diferentes

Problema: Distintas versiones de Node.js generan errores.

Solución:

-   Definir versión estándar.
-   Documentar instalación.

------------------------------------------------------------------------
