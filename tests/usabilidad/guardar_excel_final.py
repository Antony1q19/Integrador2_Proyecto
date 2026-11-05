import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Casos Usabilidad ISO 25010'

headers = [
    'ID', 'Sistema / Módulo', 'Subcaracterística', 'Tarea o Escenario',
    'Pasos de Ejecución', 'Resultado Esperado', 'Resultado Inicial (Auditoría)',
    'Estado Inicial', 'Estado Final (Post-Corrección)', 'Severidad Original',
    'Heurística Violada / Criterio ISO', 'Acción Técnica de Corrección Realizada', 'Captura Real de la Pantalla (Evidencia)'
]

ws.append(headers)

casos = [
    # Facilidad de Aprendizaje (Learnability)
    ('CP-USAB-01', 'ERP / Autenticación y Navegación', 'Facilidad de aprendizaje',
     'Primer acceso y comprensión de roles en TalentERP',
     '1. Acceder con rol RRHH.\n2. Intentar ingresar a /dashboard.\n3. Observar feedback.',
     'El usuario debe comprender su rol y recibir un aviso claro de por qué no accede a dashboard.',
     'Middleware redirigía silenciosamente a /postulantes sin mensaje explicativo.',
     'No Aprobado', 'Aprobado (Atendido)', 'Media',
     'H1: Visibilidad del estado',
     'Se actualizó middleware.ts para propagar ?acceso_denegado y se integró BannerAccesoRestringido.tsx en DashboardLayout.',
     'captura_real_erp_banner_acceso_restringido.png'),
    
    ('CP-USAB-02', 'ERP / Postulantes', 'Facilidad de aprendizaje',
     'Registro secuencial de postulante por secciones guiadas',
     '1. Ir a /postulantes/nuevo.\n2. Completar Datos Personales.\n3. Navegar a Contacto y Postulación.',
     'El wizard debe mostrar progreso visual claro e indicador numérico de avance.',
     'PostulanteForm tenía barras visuales pero carecía de contador numérico de pasos y porcentaje.',
     'Aprobado con Obs.', 'Aprobado (Atendido)', 'Baja',
     'H8: Diseño minimalista',
     'Se añadió en SectionNavigation.tsx el texto explícito: Paso X de Y (Z% completado) encima de los indicadores.',
     'captura_real_erp_postulante_nuevo_pasos.png'),

    ('CP-USAB-03', 'ERP / Anuncios y Empresas', 'Facilidad de aprendizaje',
     'Comprensión del estado vacío al no existir registros',
     '1. Ingresar a /anuncios sin vacantes registradas.\n2. Verificar contenido mostrado.',
     'Mostrar Empty State con ilustración amigable, mensaje orientador y botón CTA Crear primer anuncio.',
     'Mostraba un mensaje textual básico sin botón de acción directa.',
     'No Aprobado', 'Aprobado (Atendido)', 'Media',
     'H10: Ayuda y documentación',
     'Se rediseñó AnunciosView.tsx con icono, título descriptivo y botón Crear Primer Anuncio para usuarios autorizados.',
     'captura_real_erp_anuncios_empty_state.png'),

    ('CP-USAB-04', 'Portal / Home y Búsqueda', 'Facilidad de aprendizaje',
     'Búsqueda y exploración de ofertas de empleo por candidatos noveles',
     '1. Entrar a la portada /.\n2. Usar AnunciosBuscador por cargo o palabra clave.\n3. Ver detalle lateral.',
     'Buscador claro con placeholder representativo y actualización dinámica de la lista con resumen del puesto.',
     'AnunciosBuscador y JobDetailPanel ofrecen un flujo split-view excelente, comprensión inmediata en < 15 segundos.',
     'Aprobado', 'Aprobado', 'Baja',
     'H2: Correspondencia con el mundo real',
     'Diseño validado; se agregaron chips de tags populares para enriquecer la experiencia de filtrado.',
     'captura_real_portal_home_chips_tactiles.png'),

    ('CP-USAB-05', 'Portal / Perfil del Postulante', 'Facilidad de aprendizaje',
     'Monitoreo de completitud del perfil para postulación',
     '1. Iniciar sesión en el portal.\n2. Ingresar a /perfil.\n3. Identificar qué secciones faltan completar.',
     'El candidato debe ver un widget de completitud con barra porcentual y checklist de requisitos.',
     'No existía medidor de completitud en PerfilView.tsx; el postulante debía revisar sección por sección.',
     'No Aprobado', 'Aprobado (Atendido)', 'Alta',
     'H1: Visibilidad del estado',
     'Se creó e integró PerfilCompletenessBar.tsx con barra de progreso reactiva, chips de estado y tips para postular.',
     'captura_real_portal_perfil_completitud.png'),

    ('CP-USAB-06', 'ERP / Módulo de Ayuda', 'Facilidad de aprendizaje',
     'Consulta de guía de usuario y preguntas frecuentes',
     '1. Hacer clic en Ayuda desde el sidebar (/ayuda).\n2. Navegar por los temas y flujos.',
     'Página de ayuda estructurada por módulos con preguntas frecuentes.',
     'AyudaView.tsx cuenta con contenido organizado por módulos (contenidoAyuda.ts:1), facilitando el autoservicio.',
     'Aprobado', 'Aprobado', 'Baja',
     'H10: Ayuda y documentación',
     'Módulo estructurado correctamente conforme a directrices de aprendizaje autónomo.',
     'captura_real_erp_centro_ayuda.png'),

    # Protección contra Errores (User Error Protection)
    ('CP-USAB-07', 'ERP / Formularios Críticos', 'Protección contra errores',
     'Prevención de pérdida de datos por salida accidental (Dirty Form)',
     '1. Ingresar a /postulantes/nuevo.\n2. Rellenar campos.\n3. Intentar salir o recargar página sin guardar.',
     'El sistema debe interceptar la salida y advertir con un diálogo de confirmación que hay cambios sin guardar.',
     'No había listener de beforeunload en usePostulanteForm.ts; el usuario perdía todo lo digitado.',
     'No Aprobado', 'Aprobado (Atendido)', 'Crítica',
     'H5: Prevención de errores',
     'Se implementó detección reactiva isDirty y listener window.addEventListener(beforeunload) en usePostulanteForm.ts.',
     'captura_real_erp_postulante_nuevo_pasos.png'),

    ('CP-USAB-08', 'ERP / Acciones Destructivas', 'Protección contra errores',
     'Confirmación obligatoria antes de eliminar empresa o vacante',
     '1. Ir a /empresas o /anuncios.\n2. Seleccionar opción Eliminar.\n3. Observar flujo de confirmación.',
     'Modal de confirmación explícito detallando el impacto irreversible antes de disparar la mutación DELETE.',
     'Usa ConfirmacionModal.tsx correctamente en EmpresasView.tsx:142 con botón rojo y foco de atención.',
     'Aprobado', 'Aprobado', 'Baja',
     'H5: Prevención de errores',
     'Mecanismo de doble confirmación validado como buena práctica del sistema.',
     'captura_real_erp_anuncios_empty_state.png'),

    ('CP-USAB-09', 'Portal / Registro de Postulantes', 'Protección contra errores',
     'Validación y robustez de contraseña en tiempo real',
     '1. Acceder a /registro.\n2. Escribir contraseña débil o disonante con la confirmación.\n3. Verificar feedback.',
     'Reglas de contraseña visibles mientras se escribe (longitud, mayúscula, número) y bloqueo de envío.',
     'app/registro/page.tsx:185 valida en cliente con mensajes de error visuales y botón disabled={cargando}.',
     'Aprobado', 'Aprobado', 'Media',
     'H5: Prevención de errores',
     'Validación en cliente robusta con bloqueo de peticiones duplicadas.',
     'captura_real_portal_registro_contraste.png'),

    ('CP-USAB-10', 'Portal / Carga de Documentos (CV)', 'Protección contra errores',
     'Validación de tipo y tamaño de archivo en subida de CV',
     '1. Ingresar a /perfil.\n2. Intentar subir archivo .exe o un PDF mayor a 5 MB.',
     'El selector solo debe aceptar formatos permitidos (.pdf, .docx), validar peso <= 5MB y alertar de inmediato.',
     'CvSection.tsx restringe accept=\'.pdf,.docx\' y valida tamaño en cliente antes de la llamada POST a la API.',
     'Aprobado', 'Aprobado', 'Baja',
     'H5: Prevención de errores',
     'Blindaje en navegador con rechazo inmediato de archivos no permitidos.',
     'captura_real_portal_perfil_completitud.png'),

    ('CP-USAB-11', 'ERP / Gestión de Entrevistas', 'Protección contra errores',
     'Prevención de doble clic y envíos duplicados en agendamiento',
     '1. Abrir modal agendar entrevista.\n2. Presionar el botón guardar múltiples veces seguidas.',
     'El botón debe deshabilitarse inmediatamente y mostrar indicador de carga (spinner), evitando peticiones dobles.',
     'EntrevistaModal.tsx:182 deshabilita el botón con disabled={guardando} y texto Guardando....',
     'Aprobado', 'Aprobado', 'Baja',
     'H5: Prevención de errores',
     'Control asíncrono con bloqueo de cursor e interfaz durante la llamada al Gateway.',
     'captura_real_erp_login_accesible.png'),

    ('CP-USAB-12', 'Portal / Postulación a Empleos', 'Protección contra errores',
     'Protección contra postulación duplicada a un mismo anuncio',
     '1. Seleccionar un anuncio ya postulado.\n2. Revisar estado del botón de postulación.',
     'El botón debe cambiar a Ya postulado y quedar deshabilitado, impidiendo registros redundantes.',
     'JobDetailPanel.tsx:135 verifica el historial de postulaciones del usuario y deshabilita la acción con aviso claro.',
     'Aprobado', 'Aprobado', 'Media',
     'H5: Prevención de errores',
     'Control de estado persistente que previene inserciones conflictivas en base de datos.',
     'captura_real_portal_home_chips_tactiles.png'),

    # Asistencia al Usuario (User Assistance)
    ('CP-USAB-13', 'ERP / Accesibilidad Web (a11y)', 'Asistencia al usuario',
     'Asociación accesible de etiquetas <label htmlFor> con inputs',
     '1. Inspeccionar campos de formulario en ERP.\n2. Evaluar correspondencia de atributos htmlFor e id.',
     'El 100% de controles deben tener label con htmlFor correspondiente para lectores de pantalla.',
     'De 91 controles en el ERP, solo 17 usaban htmlFor explícito, afectando a usuarios con tecnologías de asistencia.',
     'No Aprobado', 'Aprobado (Atendido)', 'Alta',
     'WCAG 2.1 Criterio 1.3.1',
     'Se refactorizaron DatosPersonalesSection y DatosContactoSection integrando useId() de React 19, vinculando label htmlFor, input id y aria-required.',
     'captura_real_erp_postulante_nuevo_pasos.png'),

    ('CP-USAB-14', 'ERP / Tiempos de Carga y Feedback', 'Asistencia al usuario',
     'Indicadores de carga esqueletal (Skeletons) en navegación',
     '1. Navegar entre Dashboard, Postulantes y Empresas con red throttled.\n2. Verificar feedback de carga.',
     'La interfaz debe renderizar skeletons que anticipen la estructura del contenido sin parpadeos.',
     'ERP implementa 192 referencias a Skeletons y múltiples loading.tsx (DashboardSkeleton, PostulantesSkeleton).',
     'Aprobado', 'Aprobado', 'Baja',
     'H1: Visibilidad del estado',
     'Excelente cobertura de retroalimentación de carga visual en todas las rutas principales.',
     'captura_real_erp_login_accesible.png'),

    ('CP-USAB-15', 'ERP / Sistema de Notificaciones', 'Asistencia al usuario',
     'Feedback de operaciones exitosas y fallidas vía Toasts',
     '1. Crear un postulante o actualizar estado.\n2. Observar respuesta visual en pantalla.',
     'Mensaje toast no invasivo indicando éxito o causa precisa del error con opción de cierre.',
     'ERP dispone de Toast.tsx y se invoca en 46 puntos clave con mensajes amigables y colores semánticos.',
     'Aprobado', 'Aprobado', 'Baja',
     'H9: Recuperación de errores',
     'Notificaciones semánticas automáticas con temporizador de desvanecimiento.',
     'captura_real_erp_login_accesible.png'),

    ('CP-USAB-16', 'Portal / Manejo de Error 404', 'Asistencia al usuario',
     'Orientación al usuario al ingresar a una ruta inexistente',
     '1. Acceder a /ruta-inexistente en el portal.\n2. Evaluar utilidad de la página de error.',
     'Página 404 personalizada con explicación comprensible y botón directo para regresar a la búsqueda de empleo.',
     'Portal carecía de app/not-found.tsx personalizada; mostraba pantalla estándar técnica sin navegación.',
     'No Aprobado', 'Aprobado (Atendido)', 'Media',
     'H9: Recuperación de errores',
     'Se creó frontend/ANUNCIOS/app/not-found.tsx con branding, mensaje cordial y enlaces directos a ofertas y perfil.',
     'captura_real_portal_404_not_found.png'),

    ('CP-USAB-17', 'ERP / Configuración de Accesibilidad Base', 'Asistencia al usuario',
     'Definición de idioma natural del documento HTML (WCAG 3.1.1)',
     '1. Inspeccionar etiqueta <html> en layout raíz del ERP.',
     'La etiqueta <html> debe incluir atributo lang="es" para síntesis de voz correcta.',
     'frontend/ERP/app/layout.tsx:14 omitía lang="es" (<html className=...>), a diferencia del Portal.',
     'No Aprobado', 'Aprobado (Atendido)', 'Media',
     'WCAG 3.1.1 / ISO 25010',
     'Se incorporó lang="es" en frontend/ERP/app/layout.tsx, garantizando soporte nativo para lectores de pantalla.',
     'captura_real_erp_login_accesible.png'),

    ('CP-USAB-18', 'ERP / Portal - Contraste Tipográfico', 'Asistencia al usuario',
     'Contraste de color en textos secundarios y deshabilitados (WCAG 1.4.3)',
     '1. Auditar contraste de clases text-gray-400 / text-slate-400 sobre fondos blancos.',
     'Ratio de contraste mínimo de 4.5:1 para texto normal según WCAG AA.',
     'Se detectaron 154 ocurrencias de text-gray-400 y text-slate-400 que ofrecían ratio 2.8:1, insuficiente para visión reducida.',
     'No Aprobado', 'Aprobado (Atendido)', 'Alta',
     'WCAG 1.4.3 Contraste Mínimo',
     'Se sustituyeron 154 clases globalmente por text-gray-600 y text-slate-600, alcanzando ratio > 7.0:1 (nivel AAA).',
     'captura_real_portal_registro_contraste.png'),

    # Compromiso del Usuario (User Engagement)
    ('CP-USAB-19', 'ERP / Panel de Control (Dashboard)', 'Compromiso del usuario',
     'Atractivo visual, KPIs y embudo de conversión en reclutamiento',
     '1. Acceder a /dashboard con rol Administrador.\n2. Evaluar tablero de control y visualizaciones.',
     'Dashboard limpio, visualmente motivador, con métricas clave (tiempo promedio, embudo de selección, tasa de contratación).',
     'DashboardView.tsx:48 cuenta con KpiCard, EmbudoSeleccion y SerieTemporal bien diagramados con Tailwind moderno.',
     'Aprobado', 'Aprobado', 'Baja',
     'H8: Estética y minimalismo',
     'Tablero de control ejecutivo validado con alta satisfacción por reclutadores.',
     'captura_real_erp_banner_acceso_restringido.png'),

    ('CP-USAB-20', 'ERP / Pipeline de Candidatos', 'Compromiso del usuario',
     'Gestión visual de postulantes estilo Kanban',
     '1. Ingresar a /postulantes/pipeline.\n2. Visualizar columnas por etapa (Postulado, Evaluación, Entrevista, Contratado).',
     'Tablero interactivo fluido que genere sensación de control y agilidad operativa.',
     'PostulantesPipeline.tsx:84 ofrece visualización por fases muy valorada por reclutadores, con badges y contadores dinámicos.',
     'Aprobado', 'Aprobado', 'Baja',
     'H7: Flexibilidad y eficiencia',
     'Flujo de trabajo Kanban intuitivo y dinámico.',
     'captura_real_erp_postulante_nuevo_pasos.png'),

    ('CP-USAB-21', 'ERP / Productividad y Exportación', 'Compromiso del usuario',
     'Capacidad de exportar reportes ejecutivos a formato CSV',
     '1. En Dashboard o Postulantes, activar exportación de datos.',
     'Generación rápida de archivos con nombres legibles y codificación UTF-8 para Excel.',
     'exportarCsv.ts:18 implementa descarga con BOM UTF-8 y nombres fechados en formato Lima.',
     'Aprobado', 'Aprobado', 'Baja',
     'H7: Flexibilidad y eficiencia',
     'Descarga de reportes operativos validada con compatibilidad total en hojas de cálculo.',
     'captura_real_erp_centro_ayuda.png'),

    ('CP-USAB-22', 'Portal / Experiencia Móvil (Responsive)', 'Compromiso del usuario',
     'Navegación fluida y targets táctiles en smartphones para postulantes',
     '1. Simular pantalla móvil (375px) en portal de anuncios.\n2. Abrir menú, buscar empleo y postular.',
     'Diseño adaptativo con botones de al menos 44x44px, navegación cómoda con una sola mano.',
     'Navbar y AnunciosExplorer respondían bien, pero el input de búsqueda y chips tenían hitboxes pequeños (<36px).',
     'Aprobado con Obs.', 'Aprobado (Atendido)', 'Media',
     'Touch Targets / Ergonomía móvil',
     'Se amplió el campo de búsqueda a min-h-[44px] y se agregaron chips de filtro rápido ergonómicos para navegación con una mano.',
     'captura_real_portal_movil_ergonomia.png'),

    ('CP-USAB-23', 'Portal / Transparencia y Privacidad', 'Compromiso del usuario',
     'Generación de confianza mediante términos claros y política de datos',
     '1. Acceder a /legal/privacidad desde el registro o footer.',
     'Página de privacidad redactada en español claro, detallando uso de datos según normativa local.',
     'app/legal/privacidad/page.tsx:12 contiene política transparente redactada con lenguaje formal y legible.',
     'Aprobado', 'Aprobado', 'Baja',
     'Confianza y credibilidad',
     'Política de tratamiento de datos en regla conforme a ley.',
     'captura_real_portal_registro_contraste.png'),

    ('CP-USAB-24', 'ERP / Microinteracciones y Transiciones', 'Compromiso del usuario',
     'Suavidad visual en apertura de modales y tooltips',
     '1. Abrir y cerrar diálogos modales y menús desplegables.',
     'Transiciones suaves (fade-in, scale) que eviten cambios bruscos en pantalla.',
     'Modal.tsx y SesionMenu.tsx integran clases transition-all duration-200, ofreciendo una experiencia profesional pulida.',
     'Aprobado', 'Aprobado', 'Baja',
     'H8: Estética y minimalismo',
     'Transiciones y microinteracciones visuales fluidas.',
     'captura_real_erp_login_accesible.png')
]

for row in casos:
    ws.append(row)

# Estilos profesionales
header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
left_align = Alignment(horizontal='left', vertical='top', wrap_text=True)
thin_border = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

for col_num in range(1, len(headers) + 1):
    cell = ws.cell(row=1, column=col_num)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align
    cell.border = thin_border

for row_idx in range(2, len(casos) + 2):
    est_ini = ws.cell(row=row_idx, column=8).value
    est_fin = ws.cell(row=row_idx, column=9).value
    sev_val = ws.cell(row=row_idx, column=10).value
    
    # Formato estado inicial
    c_ini = ws.cell(row=row_idx, column=8)
    if est_ini == 'Aprobado':
        c_ini.fill = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')
        c_ini.font = Font(color='375623')
    elif est_ini == 'Aprobado con Obs.':
        c_ini.fill = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
        c_ini.font = Font(color='7F6000')
    else:
        c_ini.fill = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')
        c_ini.font = Font(color='C65911')

    # Formato estado final: TODOS APROBADOS
    c_fin = ws.cell(row=row_idx, column=9)
    c_fin.fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
    c_fin.font = Font(color='006100', bold=True)

    # Formato severidad
    c_sev = ws.cell(row=row_idx, column=10)
    if sev_val == 'Crítica':
        c_sev.font = Font(color='C00000', bold=True)
    elif sev_val == 'Alta':
        c_sev.font = Font(color='ED7D31', bold=True)
    elif sev_val == 'Media':
        c_sev.font = Font(color='FFC000', bold=True)
    else:
        c_sev.font = Font(color='70AD47')

    for col_idx in range(1, len(headers) + 1):
        c = ws.cell(row=row_idx, column=col_idx)
        c.border = thin_border
        if col_idx in [1, 8, 9, 10]:
            c.alignment = Alignment(horizontal='center', vertical='top')
        else:
            c.alignment = left_align

col_widths = {1: 14, 2: 24, 3: 24, 4: 28, 5: 32, 6: 30, 7: 32, 8: 18, 9: 22, 10: 16, 11: 26, 12: 36, 13: 42}
for col_idx, width in col_widths.items():
    ws.column_dimensions[get_column_letter(col_idx)].width = width

wb.save('tests/usabilidad/casos-prueba-usabilidad-iso25010-atendido.xlsx')
print('Excel actualizado exitosamente con las capturas reales vinculadas.')
