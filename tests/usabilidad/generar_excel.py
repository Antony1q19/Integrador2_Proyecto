import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Casos Usabilidad ISO 25010'

# Encabezados
headers = [
    'ID', 'Sistema / Módulo', 'Subcaracterística', 'Tarea o Escenario',
    'Pasos de Ejecución', 'Resultado Esperado', 'Resultado Obtenido (Auditoría/Simulado)',
    'Estado', 'Severidad', 'Heurística Violada / Criterio ISO', 'Recomendación Técnica'
]

ws.append(headers)

# Casos de prueba
casos = [
    # Facilidad de Aprendizaje (Learnability)
    ('CP-USAB-01', 'ERP / Autenticación y Navegación', 'Facilidad de aprendizaje',
     'Primer acceso y comprensión de roles en TalentERP',
     '1. Acceder a /login con usuario RRHH.\n2. Observar sidebar y opciones visibles.\n3. Intentar acceder a /dashboard.',
     'El usuario debe comprender su rol y ver solo opciones pertinentes, con redirección y mensaje claro.',
     'Middleware redirige silenciosamente a /postulantes sin mensaje explicativo en pantalla de por qué no accede a dashboard.',
     'No Aprobado', 'Media', 'H1: Visibilidad del estado del sistema', 'Mostrar banner o tooltip explicativo sobre permisos según el rol activo.'),
    
    ('CP-USAB-02', 'ERP / Postulantes', 'Facilidad de aprendizaje',
     'Registro secuencial de postulante por secciones guiadas',
     '1. Ir a /postulantes/nuevo.\n2. Completar Datos Personales.\n3. Navegar a Contacto y Postulación.',
     'El wizard debe mostrar progreso visual, qué campos son obligatorios y permitir navegación intuitiva.',
     'PostulanteForm posee navegación por secciones clara (SectionNavigation.tsx:44), pero carece de un indicador numérico de progreso (1/3, 2/3).',
     'Aprobado con Obs.', 'Baja', 'H8: Diseño estético y minimalista', 'Agregar barra de progreso porcentual o contador de pasos (Paso 1 de 3).'),

    ('CP-USAB-03', 'ERP / Anuncios y Empresas', 'Facilidad de aprendizaje',
     'Comprensión del estado vacío al no existir registros',
     '1. Ingresar a /anuncios sin vacantes registradas.\n2. Verificar contenido mostrado.',
     'Mostrar Empty State con ilustración amigable, mensaje orientador y botón de acción (CTA) Crear primer anuncio.',
     'Muestra mensaje textual básico en AnunciosView.tsx:112 pero no ofrece el CTA directo para usuarios con rol Admin/Supervisor.',
     'No Aprobado', 'Media', 'H10: Ayuda y documentación', 'Incorporar botón directo Crear Anuncio dentro del contenedor de lista vacía.'),

    ('CP-USAB-04', 'Portal / Home y Búsqueda', 'Facilidad de aprendizaje',
     'Búsqueda y exploración de ofertas de empleo por candidatos noveles',
     '1. Entrar a la portada /.\n2. Usar AnunciosBuscador por cargo o palabra clave.\n3. Ver detalle lateral.',
     'Buscador claro con placeholder representativo y actualización dinámica de la lista con resumen del puesto.',
     'AnunciosBuscador y JobDetailPanel ofrecen un flujo split-view excelente, comprensión inmediata en < 15 segundos.',
     'Aprobado', 'Baja', 'H2: Correspondencia entre sistema y mundo real', 'Mantener diseño; añadir sugerencias de búsqueda rápida (chips de tags).'),

    ('CP-USAB-05', 'Portal / Perfil del Postulante', 'Facilidad de aprendizaje',
     'Monitoreo de completitud del perfil para postulación',
     '1. Iniciar sesión en el portal.\n2. Ingresar a /perfil.\n3. Identificar qué secciones faltan completar.',
     'El candidato debe ver un widget de completitud (ej: 60% completo: sube tu CV para llegar al 100%).',
     'No existe barra o medidor de completitud de perfil en PerfilView.tsx; el postulante debe revisar sección por sección.',
     'No Aprobado', 'Alta', 'H1: Visibilidad del estado del sistema', 'Implementar medidor de completitud de perfil con checklist dinámico.'),

    ('CP-USAB-06', 'ERP / Módulo de Ayuda', 'Facilidad de aprendizaje',
     'Consulta de guía de usuario y preguntas frecuentes',
     '1. Hacer clic en Ayuda desde el sidebar (/ayuda).\n2. Navegar por los temas y flujos.',
     'Página de ayuda estructurada por módulos con buscador y preguntas frecuentes.',
     'AyudaView.tsx cuenta con contenido organizado por módulos (contenidoAyuda.ts:1), facilitando el autoservicio.',
     'Aprobado', 'Baja', 'H10: Ayuda y documentación', 'Incorporar buscador interactivo dentro de la sección de ayuda.'),

    # Protección contra Errores (User Error Protection)
    ('CP-USAB-07', 'ERP / Formularios Críticos', 'Protección contra errores',
     'Prevención de pérdida de datos por salida accidental (Dirty Form)',
     '1. Ingresar a /postulantes/nuevo.\n2. Rellenar 8 campos.\n3. Hacer clic en Empresas en el sidebar sin guardar.',
     'El sistema debe interceptar la navegación y advertir con un diálogo de confirmación que hay cambios sin guardar.',
     'No hay listener de beforeunload ni bloqueo de enrutador en usePostulanteForm.ts; el usuario pierde todo lo escrito.',
     'No Aprobado', 'Crítica', 'H5: Prevención de errores', 'Implementar hook useWarnIfUnsavedChanges con evento beforeunload y control de Next Router.'),

    ('CP-USAB-08', 'ERP / Acciones Destructivas', 'Protección contra errores',
     'Confirmación obligatoria antes de eliminar empresa o vacante',
     '1. Ir a /empresas.\n2. Seleccionar opción Eliminar empresa.\n3. Observar flujo de confirmación.',
     'Modal de confirmación explícito detallando el impacto irreversible antes de disparar la mutación DELETE.',
     'Usa ConfirmacionModal.tsx correctamente en EmpresasView.tsx:142 con botón rojo y foco de atención.',
     'Aprobado', 'Baja', 'H5: Prevención de errores', 'Mantener estándar; exigir escribir el nombre de la empresa para eliminaciones críticas.'),

    ('CP-USAB-09', 'Portal / Registro de Postulantes', 'Protección contra errores',
     'Validación y robustez de contraseña en tiempo real',
     '1. Acceder a /registro.\n2. Escribir contraseña débil o disonante con la confirmación.\n3. Verificar feedback.',
     'Reglas de contraseña visibles mientras se escribe (longitud, mayúscula, número) y bloqueo de envío.',
     'app/registro/page.tsx:185 valida en cliente con mensajes de error visuales y botón disabled={cargando}.',
     'Aprobado', 'Media', 'H5: Prevención de errores', 'Agregar indicador gráfico de fuerza de contraseña (débil, media, fuerte).'),

    ('CP-USAB-10', 'Portal / Carga de Documentos (CV)', 'Protección contra errores',
     'Validación de tipo y tamaño de archivo en subida de CV',
     '1. Ingresar a /perfil.\n2. Intentar subir archivo .exe o un PDF de 25 MB.',
     'El selector solo debe aceptar formatos permitidos (.pdf, .docx), validar peso <= 5MB y alertar de inmediato.',
     'CvSection.tsx restringe accept=\'.pdf,.docx\' y valida tamaño en cliente antes de la llamada POST a la API.',
     'Aprobado', 'Baja', 'H5: Prevención de errores', 'Incluir mensaje textual visible con el límite explícito: Máx. 5MB (PDF o Word).'),

    ('CP-USAB-11', 'ERP / Gestión de Entrevistas', 'Protección contra errores',
     'Prevención de doble clic y envíos duplicados en agendamiento',
     '1. Abrir modal agendar entrevista.\n2. Presionar el botón guardar múltiples veces seguidas.',
     'El botón debe deshabilitarse inmediatamente y mostrar indicador de carga (spinner), evitando peticiones dobles.',
     'EntrevistaModal.tsx:182 deshabilita el botón con disabled={guardando} y texto Guardando....',
     'Aprobado', 'Baja', 'H5: Prevención de errores', 'Mantener en todos los formularios secundarios.'),

    ('CP-USAB-12', 'Portal / Postulación a Empleos', 'Protección contra errores',
     'Protección contra postulación duplicada a un mismo anuncio',
     '1. Seleccionar un anuncio ya postulado.\n2. Revisar estado del botón de postulación.',
     'El botón debe cambiar a Ya postulado y quedar deshabilitado, impidiendo registros redundantes.',
     'JobDetailPanel.tsx:135 verifica el historial de postulaciones del usuario y deshabilita la acción con aviso claro.',
     'Aprobado', 'Media', 'H5: Prevención de errores', 'Excelente práctica; añadir enlace directo a Ver mi postulación en Historial.'),

    # Asistencia al Usuario (User Assistance)
    ('CP-USAB-13', 'ERP / Accesibilidad Web (a11y)', 'Asistencia al usuario',
     'Asociación accesible de etiquetas <label htmlFor> con inputs',
     '1. Inspeccionar campos de formulario en ERP.\n2. Evaluar correspondencia de atributos htmlFor e id.',
     'El 100% de controles deben tener label con htmlFor correspondiente para lectores de pantalla.',
     'De 91 controles de entrada en el ERP, solo 17 usan htmlFor explícito (la mayoría anida inputs o usa divs sin id).',
     'No Aprobado', 'Alta', 'Accesibilidad WCAG 2.1 / H10', 'Refactorizar componentes de formulario para vincular id/htmlFor y aria-describedby.'),

    ('CP-USAB-14', 'ERP / Tiempos de Carga y Feedback', 'Asistencia al usuario',
     'Indicadores de carga esqueletal (Skeletons) en navegación',
     '1. Navegar entre Dashboard, Postulantes y Empresas con red throttled.\n2. Verificar feedback de carga.',
     'La interfaz debe renderizar skeletons que anticipen la estructura del contenido sin parpadeos.',
     'ERP implementa 192 referencias a Skeletons y múltiples loading.tsx (DashboardSkeleton, PostulantesSkeleton).',
     'Aprobado', 'Baja', 'H1: Visibilidad del estado del sistema', 'Excelente cobertura de estados de carga en todas las rutas principales.'),

    ('CP-USAB-15', 'ERP / Sistema de Notificaciones', 'Asistencia al usuario',
     'Feedback de operaciones exitosas y fallidas vía Toasts',
     '1. Crear un postulante o actualizar estado.\n2. Observar respuesta visual en pantalla.',
     'Mensaje toast no invasivo indicando éxito o causa precisa del error con opción de cierre.',
     'ERP dispone de Toast.tsx y se invoca en 46 puntos clave con mensajes amigables y colores semánticos.',
     'Aprobado', 'Baja', 'H9: Reconocer, diagnosticar y recuperarse de errores', 'Mantener diseño.'),

    ('CP-USAB-16', 'Portal / Manejo de Error 404', 'Asistencia al usuario',
     'Orientación al usuario al ingresar a una ruta inexistente',
     '1. Acceder a /ruta-inexistente en el portal.\n2. Evaluar utilidad de la página de error.',
     'Página 404 personalizada con explicación comprensible y botón directo para regresar a la búsqueda de empleo.',
     'Portal carece de app/not-found.tsx personalizada (usa pantalla por defecto de Next.js sin branding ni CTA útil).',
     'No Aprobado', 'Media', 'H9: Reconocer, diagnosticar y recuperarse de errores', 'Crear app/not-found.tsx con ilustración, mensaje empático y botón Ver ofertas laborales.'),

    ('CP-USAB-17', 'ERP / Configuración de Accesibilidad Base', 'Asistencia al usuario',
     'Definición de idioma natural del documento HTML (WCAG 3.1.1)',
     '1. Inspeccionar etiqueta <html> en layout raíz del ERP.',
     'La etiqueta <html> debe incluir atributo lang="es" para síntesis de voz correcta.',
     'frontend/ERP/app/layout.tsx:14 omite lang="es" (<html className=...>), a diferencia del Portal que sí lo incluye.',
     'No Aprobado', 'Media', 'WCAG 3.1.1 / ISO 25010 Asistencia', 'Añadir lang="es" en frontend/ERP/app/layout.tsx.'),

    ('CP-USAB-18', 'ERP / Portal - Contraste Tipográfico', 'Asistencia al usuario',
     'Contraste de color en textos secundarios y deshabilitados (WCAG 1.4.3)',
     '1. Auditar contraste de clases text-gray-400 / text-slate-400 sobre fondos blancos.',
     'Ratio de contraste mínimo de 4.5:1 para texto normal según WCAG AA.',
     'Se detectaron 134 ocurrencias de text-gray-400 en ERP y 20 en Portal que ofrecen un ratio de ~2.8:1, insuficiente para baja visión.',
     'No Aprobado', 'Alta', 'WCAG 1.4.3 Contraste Mínimo', 'Elevar tonos de texto secundario de text-gray-400 a text-gray-600 o text-slate-600.'),

    # Compromiso del Usuario (User Engagement)
    ('CP-USAB-19', 'ERP / Panel de Control (Dashboard)', 'Compromiso del usuario',
     'Atractivo visual, KPIs y embudo de conversión en reclutamiento',
     '1. Acceder a /dashboard con rol Administrador.\n2. Evaluar tablero de control y visualizaciones.',
     'Dashboard limpio, visualmente motivador, con métricas clave (tiempo promedio, embudo de selección, tasa de contratación).',
     'DashboardView.tsx:48 cuenta con KpiCard, EmbudoSeleccion y SerieTemporal bien diagramados con Tailwind moderno.',
     'Aprobado', 'Baja', 'H8: Estética y diseño minimalista', 'Permitir reordenamiento o personalización de widgets según interés del usuario.'),

    ('CP-USAB-20', 'ERP / Pipeline de Candidatos', 'Compromiso del usuario',
     'Gestión visual de postulantes estilo Kanban',
     '1. Ingresar a /postulantes/pipeline.\n2. Visualizar columnas por etapa (Postulado, Evaluación, Entrevista, Contratado).',
     'Tablero interactivo fluido que genere sensación de control y agilidad operativa.',
     'PostulantesPipeline.tsx:84 ofrece visualización por fases muy valorada por reclutadores, con badges y contadores dinámicos.',
     'Aprobado', 'Baja', 'H7: Flexibilidad y eficiencia de uso', 'Habilitar Drag & Drop nativo entre columnas para potenciar el engagement.'),

    ('CP-USAB-21', 'ERP / Productividad y Exportación', 'Compromiso del usuario',
     'Capacidad de exportar reportes ejecutivos a formato CSV',
     '1. En Dashboard o Postulantes, activar exportación de datos.',
     'Generación rápida de archivos con nombres legibles y codificación UTF-8 para Excel.',
     'exportarCsv.ts:18 implementa descarga con BOM UTF-8 y nombres fechados en formato Lima.',
     'Aprobado', 'Baja', 'H7: Flexibilidad y eficiencia de uso', 'Excelente implementación; añadir exportación directa a formato PDF resumen.'),

    ('CP-USAB-22', 'Portal / Experiencia Móvil (Responsive)', 'Compromiso del usuario',
     'Navegación fluida y targets táctiles en smartphones para postulantes',
     '1. Simular pantalla móvil (375px) en portal de anuncios.\n2. Abrir menú, buscar empleo y postular.',
     'Diseño adaptativo con botones de al menos 44x44px, navegación cómoda con una sola mano.',
     'Navbar y AnunciosExplorer responden con Tailwind (md:flex, sm:grid), pero algunos chips de filtro tienen hitboxes pequeños (<36px).',
     'Aprobado con Obs.', 'Media', 'Ergonomía móvil / Touch Targets', 'Aumentar padding en botones táctiles móviles a un mínimo de h-11 / p-3.'),

    ('CP-USAB-23', 'Portal / Transparencia y Privacidad', 'Compromiso del usuario',
     'Generación de confianza mediante términos claros y política de datos',
     '1. Acceder a /legal/privacidad desde el registro o footer.',
     'Página de privacidad redactada en español claro, detallando uso de datos según normativa local.',
     'app/legal/privacidad/page.tsx:12 contiene política transparente redactada con lenguaje formal y legible.',
     'Aprobado', 'Baja', 'Confianza y credibilidad', 'Mantener actualizada conforme a la Ley de Protección de Datos Personales (Perú).'),

    ('CP-USAB-24', 'ERP / Microinteracciones y Transiciones', 'Compromiso del usuario',
     'Suavidad visual en apertura de modales y tooltips',
     '1. Abrir y cerrar diálogos modales y menús desplegables.',
     'Transiciones suaves (fade-in, scale) que eviten cambios bruscos en pantalla.',
     'Modal.tsx y SesionMenu.tsx integran clases transition-all duration-200, ofreciendo una experiencia profesional pulida.',
     'Aprobado', 'Baja', 'H8: Estética y diseño minimalista', 'Mantener consistencia en nuevos componentes.')
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
    estado_val = ws.cell(row=row_idx, column=8).value
    sev_val = ws.cell(row=row_idx, column=9).value
    
    # Formato de estado
    estado_cell = ws.cell(row=row_idx, column=8)
    if estado_val == 'Aprobado':
        estado_cell.fill = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')
        estado_cell.font = Font(color='375623', bold=True)
    elif estado_val == 'Aprobado con Obs.':
        estado_cell.fill = PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid')
        estado_cell.font = Font(color='7F6000', bold=True)
    else:
        estado_cell.fill = PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid')
        estado_cell.font = Font(color='C65911', bold=True)

    # Formato de severidad
    sev_cell = ws.cell(row=row_idx, column=9)
    if sev_val == 'Crítica':
        sev_cell.font = Font(color='C00000', bold=True)
    elif sev_val == 'Alta':
        sev_cell.font = Font(color='ED7D31', bold=True)
    elif sev_val == 'Media':
        sev_cell.font = Font(color='FFC000', bold=True)
    else:
        sev_cell.font = Font(color='70AD47')

    for col_idx in range(1, len(headers) + 1):
        c = ws.cell(row=row_idx, column=col_idx)
        c.border = thin_border
        if col_idx in [1, 8, 9]:
            c.alignment = Alignment(horizontal='center', vertical='top')
        else:
            c.alignment = left_align

# Ajuste ancho columnas
col_widths = {1: 14, 2: 26, 3: 24, 4: 30, 5: 35, 6: 32, 7: 35, 8: 18, 9: 14, 10: 28, 11: 35}
for col_idx, width in col_widths.items():
    ws.column_dimensions[get_column_letter(col_idx)].width = width

wb.save('tests/usabilidad/casos-prueba-usabilidad-iso25010.xlsx')
print('Excel generado exitosamente con 24 casos de prueba estructurados.')
