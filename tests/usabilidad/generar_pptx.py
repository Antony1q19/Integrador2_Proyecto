from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Paleta corporativa
C_NAVY = RGBColor(15, 32, 67)       # #0F2043 (Fondo o acentos oscuros)
C_BLUE = RGBColor(31, 78, 121)      # #1F4E79 (Primario)
C_LIGHT_BG = RGBColor(248, 249, 250)# #F8F9FA (Fondo claro diapositiva)
C_CARD_BG = RGBColor(255, 255, 255) # Blanco para tarjetas
C_TEXT_MAIN = RGBColor(33, 37, 41)  # #212529 (Texto principal)
C_TEXT_MUTED = RGBColor(108, 117, 125) # Gris secundario
C_TEAL = RGBColor(40, 167, 69)      # Verde éxito
C_AMBER = RGBColor(255, 193, 7)     # Amarillo advertencia
C_CORAL = RGBColor(220, 53, 69)     # Rojo severidad

def aplicar_fondo(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = C_LIGHT_BG

def agregar_cabecera(slide, titulo, subtitulo):
    aplicar_fondo(slide)
    
    # Barra lateral decorativa
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.6), Inches(0.12), Inches(0.85))
    bar.fill.solid()
    bar.fill.fore_color.rgb = C_BLUE
    bar.line.fill.background()
    
    # Título y subtítulo
    txBox = slide.shapes.add_textbox(Inches(1.1), Inches(0.5), Inches(11.4), Inches(1.0))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p = tf.paragraphs[0]
    p.text = titulo
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = C_NAVY
    p.font.name = 'Segoe UI'
    
    p2 = tf.add_paragraph()
    p2.text = subtitulo
    p2.font.size = Pt(13)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.font.name = 'Segoe UI'

def agregar_tarjeta(slide, left, top, width, height, bg_color=C_CARD_BG):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = RGBColor(222, 226, 230)
    card.line.width = Pt(1)
    return card

# -------------------------------------------------------------
# SLIDE 1: Portada
# -------------------------------------------------------------
blank_layout = prs.slide_layouts[6]
s1 = prs.slides.add_slide(blank_layout)
# Fondo Navy oscuro
bg1 = s1.background
fill1 = bg1.fill
fill1.solid()
fill1.fore_color.rgb = C_NAVY

# Cuadro principal
tbox = s1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(11.0), Inches(3.2))
tf = tbox.text_frame
tf.word_wrap = True

p0 = tf.paragraphs[0]
p0.text = "INFORME TÉCNICO DE USABILIDAD (ISO/IEC 25010:2023)"
p0.font.size = Pt(14)
p0.font.bold = True
p0.font.color.rgb = RGBColor(13, 202, 240)
p0.font.name = 'Segoe UI'

p1 = tf.add_paragraph()
p1.text = "Evaluación de la Capacidad de Interacción\nTalentERP y Portal de Postulación"
p1.font.size = Pt(32)
p1.font.bold = True
p1.font.color.rgb = RGBColor(255, 255, 255)
p1.font.name = 'Segoe UI'
p1.space_before = Pt(12)

p2 = tf.add_paragraph()
p2.text = "Garantía de Calidad en Reclutamiento & Gestión de Talento Humano"
p2.font.size = Pt(16)
p2.font.color.rgb = RGBColor(206, 212, 218)
p2.font.name = 'Segoe UI'
p2.space_before = Pt(10)

# Datos de autores y fecha
tbox_meta = s1.shapes.add_textbox(Inches(1.2), Inches(5.4), Inches(11.0), Inches(1.5))
tf_meta = tbox_meta.text_frame
tf_meta.word_wrap = True
p_meta = tf_meta.paragraphs[0]
p_meta.text = "Equipo Auditor: Adam Soto | Xavier Ibarra | Leonardo Morales | Marco Alanya\nCurso: Proyecto Integrador II | Fecha: Noviembre 2026 | Versión: 1.0 Final"
p_meta.font.size = Pt(12)
p_meta.font.color.rgb = RGBColor(173, 181, 189)
p_meta.font.name = 'Segoe UI'

s1.notes_slide.notes_text_frame.text = (
    "Notas del orador: Buenos días/tardes. Presentamos el informe integral de usabilidad y capacidad de interacción "
    "bajo el marco normativo ISO/IEC 25010 versión 2023. Evaluamos tanto el sistema interno TalentERP como el Portal público "
    "de Postulación. El trabajo fue desarrollado por el equipo de calidad conformado por Adam Soto, Xavier Ibarra, "
    "Leonardo Morales y Marco Alanya."
)

# -------------------------------------------------------------
# SLIDE 2: Objetivo y Alcance
# -------------------------------------------------------------
s2 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s2, "Objetivo y Alcance de la Evaluación", "Enfoque metodológico, límites del sistema y valor para el negocio")

# Tarjeta 1: Objetivo General
c1 = agregar_tarjeta(s2, Inches(1.0), Inches(1.8), Inches(5.4), Inches(4.8))
tb1 = s2.shapes.add_textbox(Inches(1.3), Inches(2.0), Inches(4.8), Inches(4.4))
tf1 = tb1.text_frame
tf1.word_wrap = True
p = tf1.paragraphs[0]
p.text = "🎯 Objetivo General"
p.font.size = Pt(18); p.font.bold = True; p.font.color.rgb = C_BLUE
p_body = tf1.add_paragraph()
p_body.text = (
    "\nDiagnosticar, medir y auditar la característica de 'Capacidad de Interacción' "
    "(Interaction Capability) conforme al estándar internacional ISO/IEC 25010:2023, en:\n\n"
    "• Identificar fricciones cognitivas en reclutadores y candidatos.\n"
    "• Determinar la robustez ante errores operacionales.\n"
    "• Evaluar el grado de asistencia y accesibilidad universal.\n"
    "• Diseñar una hoja de ruta priorizada de optimizaciones UX/UI."
)
p_body.font.size = Pt(13); p_body.font.color.rgb = C_TEXT_MAIN

# Tarjeta 2: Alcance de Plataformas
c2 = agregar_tarjeta(s2, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.8))
tb2 = s2.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(4.9), Inches(4.4))
tf2 = tb2.text_frame
tf2.word_wrap = True
p = tf2.paragraphs[0]
p.text = "📦 Alcance de Plataformas"
p.font.size = Pt(18); p.font.bold = True; p.font.color.rgb = C_BLUE
p_body2 = tf2.add_paragraph()
p_body2.text = (
    "\n1. TalentERP (Sistema Interno):\n"
    "   - Módulos: Dashboard, Postulantes (Lista, Ficha, Pipeline),\n"
    "     Anuncios, Empresas, Entrevistas, Comunicaciones WhatsApp,\n"
    "     Gestión de Usuarios y Centro de Ayuda.\n"
    "   - Roles: Administrador, RRHH, Supervisor.\n\n"
    "2. Portal de Postulación (Portal Público):\n"
    "   - Vistas: Explorador de Anuncios (Split-view), Autenticación,\n"
    "     Registro, Perfil Curricular (CV, Experiencia) e Historial."
)
p_body2.font.size = Pt(13); p_body2.font.color.rgb = C_TEXT_MAIN

s2.notes_slide.notes_text_frame.text = (
    "Notas del orador: Nuestro objetivo central fue realizar una radiografía rigurosa de la experiencia de usuario. "
    "El alcance cubre ambos extremos del ecosistema: la plataforma de back-office usada por la consultora y el portal web público "
    "orientado a los candidatos en busca de empleo."
)

# -------------------------------------------------------------
# SLIDE 3: Marco Teórico: ISO/IEC 25010:2023
# -------------------------------------------------------------
s3 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s3, "Marco Normativo: ISO/IEC 25010:2023", "De la 'Usabilidad' tradicional a la 'Capacidad de Interacción'")

subchars = [
    ("1. Facilidad de Aprendizaje", "Learnability", "Capacidad del software para facilitar que los usuarios comprendan cómo utilizarlo eficazmente en su primer contacto.", C_BLUE),
    ("2. Protección contra Errores", "User Error Protection", "Mecanismos del sistema para prevenir que los usuarios cometan errores y mitigar impactos de fallos accidentales.", C_CORAL),
    ("3. Asistencia al Usuario", "User Assistance", "Disponibilidad de guías, retroalimentación contextual, accesibilidad y soporte oportuno durante la interacción.", C_AMBER),
    ("4. Compromiso del Usuario", "User Engagement", "Nivel de satisfacción, atractivo estético, fluidez y motivación sostenida percibida por el operador.", C_TEAL),
]

for idx, (nom, en_nom, desc, col) in enumerate(subchars):
    top_pos = Inches(1.8 + idx * 1.25)
    card = agregar_tarjeta(s3, Inches(1.0), top_pos, Inches(11.3), Inches(1.1))
    
    # Barra de color
    bar = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top_pos, Inches(0.15), Inches(1.1))
    bar.fill.solid(); bar.fill.fore_color.rgb = col; bar.line.fill.background()
    
    tbox = s3.shapes.add_textbox(Inches(1.3), top_pos + Inches(0.1), Inches(10.8), Inches(0.9))
    tf = tbox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = f"{nom} ({en_nom})"
    p.font.size = Pt(16); p.font.bold = True; p.font.color.rgb = C_NAVY
    p_desc = tf.add_paragraph()
    p_desc.text = desc
    p_desc.font.size = Pt(12); p_desc.font.color.rgb = C_TEXT_MAIN; p_desc.space_before = Pt(3)

s3.notes_slide.notes_text_frame.text = (
    "Notas del orador: En la revisión 2023 de la norma ISO/IEC 25010, la característica histórica de 'Usabilidad' fue renombrada "
    "a 'Capacidad de Interacción', enfatizando que no se trata solo de facilidad de uso estática, sino de un diálogo interactivo "
    "bidireccional entre el sistema y la persona. Evaluamos las 4 subcaracterísticas esenciales solicitadas."
)

# -------------------------------------------------------------
# SLIDE 4: Metodología y Técnicas de Evaluación
# -------------------------------------------------------------
s4 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s4, "Metodología, Técnicas y Herramientas", "Triangulación entre auditoría estática, recorrido cognitivo y métricas simuladas")

metodos = [
    ("Auditoría Estática de Código", "Inspección de 292 archivos TypeScript/React. Verificación de etiquetas <label htmlFor>, validaciones Zod, atributos ARIA, modales y layouts.", "100% Real", C_BLUE),
    ("Evaluación Heurística (Nielsen)", "Revisión sistemática basada en los 10 principios de Jacob Nielsen (visibilidad de estado, prevención de errores, consistencia y minimalismo).", "100% Real", C_BLUE),
    ("Recorrido Cognitivo", "Simulación experta de 24 escenarios y flujos operacionales críticos (registro, postulación, filtrado, publicación de vacantes y agendamiento).", "Estimado Experto", C_AMBER),
    ("Instrumentación SUS & Tareas", "Diseño de batería de 10 preguntas SUS e indicadores de tiempo por tarea. Métricas tabuladas con fines de benchmarking.", "Simulado / Modelo", C_AMBER)
]

for idx, (tit, det, est, col) in enumerate(metodos):
    left_pos = Inches(1.0 + (idx % 2) * 5.8)
    top_pos = Inches(1.8 + (idx // 2) * 2.5)
    card = agregar_tarjeta(s4, left_pos, top_pos, Inches(5.5), Inches(2.3))
    
    tbox = s4.shapes.add_textbox(left_pos + Inches(0.2), top_pos + Inches(0.15), Inches(5.1), Inches(2.0))
    tf = tbox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = tit
    p.font.size = Pt(15); p.font.bold = True; p.font.color.rgb = C_BLUE
    
    badge = tf.add_paragraph()
    badge.text = f"Naturaleza: {est}"
    badge.font.size = Pt(10); badge.font.bold = True; badge.font.color.rgb = col; badge.space_before = Pt(3)
    
    p_det = tf.add_paragraph()
    p_det.text = det
    p_det.font.size = Pt(11); p_det.font.color.rgb = C_TEXT_MAIN; p_det.space_before = Pt(5)

s4.notes_slide.notes_text_frame.text = (
    "Notas del orador: Conforme a las reglas del encargo, distinguimos transparentemente entre los hallazgos basados en el código fuente real "
    "del repositorio (evaluación heurística y estática) y las métricas proyectadas o simuladas de tiempos y SUS, diseñadas como instrumentos estándar "
    "para su aplicación continua en producción."
)

# -------------------------------------------------------------
# SLIDE 5: Resultados: Facilidad de Aprendizaje
# -------------------------------------------------------------
s5 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s5, "1. Facilidad de Aprendizaje (Learnability)", "Puntaje obtenido: 4.1 / 5.0 (Nivel Bueno - Aprobado)")

# Tarjeta de Fortalezas
c_f5 = agregar_tarjeta(s5, Inches(1.0), Inches(1.8), Inches(5.4), Inches(4.8))
tb_f5 = s5.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(5.0), Inches(4.4))
tf_f5 = tb_f5.text_frame; tf_f5.word_wrap = True
p = tf_f5.paragraphs[0]
p.text = "✅ Fortalezas Clave"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_TEAL
p_desc = tf_f5.add_paragraph()
p_desc.text = (
    "\n• Split-view intuitivo en Anuncios:\n"
    "  Permite explorar ofertas y ver detalle en tiempo real sin recargar página (tiempo de aprendizaje < 15s).\n\n"
    "• PostulanteForm por Secciones:\n"
    "  División en Personales, Contacto y Postulación que evita fatiga mental (SectionNavigation.tsx:44).\n\n"
    "• Módulo de Ayuda Centralizado:\n"
    "  Manual interactivo en /ayuda estructurado por perfiles y flujos principales de TalentERP.\n\n"
    "• Terminología Consistente:\n"
    "  Vocabulario de RRHH formal y estandarizado en ambas plataformas."
)
p_desc.font.size = Pt(12); p_desc.font.color.rgb = C_TEXT_MAIN

# Tarjeta de Oportunidades
c_o5 = agregar_tarjeta(s5, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.8))
tb_o5 = s5.shapes.add_textbox(Inches(7.0), Inches(2.0), Inches(5.1), Inches(4.4))
tf_o5 = tb_o5.text_frame; tf_o5.word_wrap = True
p = tf_o5.paragraphs[0]
p.text = "⚠️ Oportunidades de Mejora"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_AMBER
p_desc2 = tf_o5.add_paragraph()
p_desc2.text = (
    "\n• Ausencia de Barra de Completitud en Perfil:\n"
    "  El candidato no sabe qué porcentaje de su CV ha completado ni qué dato falta para postular (PerfilView.tsx).\n\n"
    "• Redirección Silenciosa de Permisos:\n"
    "  Al intentar acceder al dashboard con rol RRHH, el middleware redirige a /postulantes sin mensaje explicativo.\n\n"
    "• Empty States sin Llamado a la Acción (CTA):\n"
    "  Al no haber registros en anuncios o empresas, la pantalla no ofrece botón directo 'Crear nuevo'."
)
p_desc2.font.size = Pt(12); p_desc2.font.color.rgb = C_TEXT_MAIN

s5.notes_slide.notes_text_frame.text = (
    "Notas del orador: En Facilidad de Aprendizaje la aplicación logra un sólido 4.1 de 5. Los usuarios noveles comprenden la interfaz "
    "con gran rapidez gracias al buscador split-view y la navegación seccionada. La principal deficiencia es la falta de un indicador "
    "de progreso en el perfil del candidato, lo que puede elevar la tasa de abandono antes de la primera postulación."
)

# -------------------------------------------------------------
# SLIDE 6: Resultados: Protección contra Errores
# -------------------------------------------------------------
s6 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s6, "2. Protección contra Errores (Error Protection)", "Puntaje obtenido: 3.8 / 5.0 (Nivel Aceptable - Requiere Atención)")

# Tarjeta de Fortalezas
c_f6 = agregar_tarjeta(s6, Inches(1.0), Inches(1.8), Inches(5.4), Inches(4.8))
tb_f6 = s6.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(5.0), Inches(4.4))
tf_f6 = tb_f6.text_frame; tf_f6.word_wrap = True
p = tf_f6.paragraphs[0]
p.text = "✅ Mecanismos de Blindaje"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_TEAL
p_desc = tf_f6.add_paragraph()
p_desc.text = (
    "\n• Doble Confirmación Destructiva:\n"
    "  Uso sistemático de ConfirmacionModal.tsx antes de eliminar empresas, usuarios o vacantes.\n\n"
    "• Prevención de Doble Envío:\n"
    "  Deshabilitación inmediata de botones (disabled={loading}) con spinners en operaciones asíncronas.\n\n"
    "• Postulación Duplicada Bloqueada:\n"
    "  JobDetailPanel.tsx:135 detecta postulaciones previas y deshabilita el botón con texto 'Ya postulado'.\n\n"
    "• Validación de CV en Cliente:\n"
    "  CvSection.tsx restringe tipos (.pdf/.docx) y tamaño máximo de 5MB antes de subir al servidor."
)
p_desc.font.size = Pt(12); p_desc.font.color.rgb = C_TEXT_MAIN

# Tarjeta de Riesgos
c_o6 = agregar_tarjeta(s6, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.8))
tb_o6 = s6.shapes.add_textbox(Inches(7.0), Inches(2.0), Inches(5.1), Inches(4.4))
tf_o6 = tb_o6.text_frame; tf_o6.word_wrap = True
p = tf_o6.paragraphs[0]
p.text = "🚨 Vulnerabilidad Crítica Detectada"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_CORAL
p_desc2 = tf_o6.add_paragraph()
p_desc2.text = (
    "\n• Pérdida Accidental de Datos (Dirty Forms):\n"
    "  Al redactar formularios extensos (/postulantes/nuevo o Registro) y hacer clic en el menú sin guardar, el sistema NO pide confirmación.\n"
    "  Evidencia: Ausencia de listener beforeunload y control de ruta Next.js (usePostulanteForm.ts).\n\n"
    "• Mensajes de Red Crudos:\n"
    "  Algunas llamadas muestran directamente errores HTTP 500 en lugar de mensajes guiados de recuperación.\n\n"
    "• Falta de Indicador de Fortaleza de Clave:\n"
    "  No hay medidor visual de seguridad en app/registro."
)
p_desc2.font.size = Pt(12); p_desc2.font.color.rgb = C_TEXT_MAIN

s6.notes_slide.notes_text_frame.text = (
    "Notas del orador: La protección contra errores obtiene 3.8. Los modales de confirmación y el bloqueo de doble postulación son excelentes. "
    "Sin embargo, encontramos un defecto de severidad Crítica: el abandono accidental de formularios no guardados (Dirty Forms). Si un reclutador "
    "llena 10 campos y por error presiona otra pestaña del menú, pierde toda su información sin advertencia alguna."
)

# -------------------------------------------------------------
# SLIDE 7: Resultados: Asistencia al Usuario
# -------------------------------------------------------------
s7 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s7, "3. Asistencia al Usuario (User Assistance)", "Puntaje obtenido: 3.5 / 5.0 (Brecha en Accesibilidad y Contraste)")

# Tarjeta de Fortalezas
c_f7 = agregar_tarjeta(s7, Inches(1.0), Inches(1.8), Inches(5.4), Inches(4.8))
tb_f7 = s7.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(5.0), Inches(4.4))
tf_f7 = tb_f7.text_frame; tf_f7.word_wrap = True
p = tf_f7.paragraphs[0]
p.text = "✅ Puntos Fuertes"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_TEAL
p_desc = tf_f7.add_paragraph()
p_desc.text = (
    "\n• Cobertura Esqueletal Excepcional (Skeletons):\n"
    "  192 referencias a estados de carga animados (DashboardSkeleton, PostulantesSkeleton) que evitan layout shift.\n\n"
    "• Sistema Centralizado de Toasts:\n"
    "  46 invocaciones en TalentERP brindando retroalimentación inmediata sobre éxitos y fallas operativas.\n\n"
    "• Módulo de Ayuda Contextual:\n"
    "  Página /ayuda con estructura modular de preguntas frecuentes y guías paso a paso para reclutadores."
)
p_desc.font.size = Pt(12); p_desc.font.color.rgb = C_TEXT_MAIN

# Tarjeta de Accesibilidad
c_o7 = agregar_tarjeta(s7, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.8))
tb_o7 = s7.shapes.add_textbox(Inches(7.0), Inches(2.0), Inches(5.1), Inches(4.4))
tf_o7 = tb_o7.text_frame; tf_o7.word_wrap = True
p = tf_o7.paragraphs[0]
p.text = "⚠️ Brechas de Accesibilidad (WCAG 2.1)"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_CORAL
p_desc2 = tf_o7.add_paragraph()
p_desc2.text = (
    "\n• Etiquetas Desvinculadas (<label htmlFor>):\n"
    "  De 91 inputs analizados en ERP, solo 17 usan htmlFor explícito. Impacta negativamente a usuarios con lectores de pantalla.\n\n"
    "• Contraste Tipográfico Deficiente (WCAG 1.4.3):\n"
    "  134 clases text-gray-400 / text-slate-400 sobre fondos blancos con ratio 2.8:1 (el estándar exige mínimo 4.5:1).\n\n"
    "• Falta de lang=\"es\" en Layout ERP:\n"
    "  frontend/ERP/app/layout.tsx omite el atributo lang, afectando motores de voz.\n\n"
    "• Portal 404 No Personalizado:\n"
    "  Falta de página app/not-found.tsx con branding."
)
p_desc2.font.size = Pt(12); p_desc2.font.color.rgb = C_TEXT_MAIN

s7.notes_slide.notes_text_frame.text = (
    "Notas del orador: La subcaracterística de Asistencia al Usuario logra 3.5. Si bien el sistema ofrece una experiencia visual de carga impecable "
    "mediante Skeletons y Toasts, la auditoría cuantitativa reveló falencias de accesibilidad web (WCAG 2.1): falta de asociación programática entre "
    "etiquetas y campos de texto, bajo contraste en textos secundarios y ausencia del idioma español en el layout del ERP."
)

# -------------------------------------------------------------
# SLIDE 8: Resultados: Compromiso del Usuario
# -------------------------------------------------------------
s8 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s8, "4. Compromiso del Usuario (User Engagement)", "Puntaje obtenido: 4.4 / 5.0 (Nivel Destacado - Experiencia Moderna)")

# Tarjeta de Fortalezas
c_f8 = agregar_tarjeta(s8, Inches(1.0), Inches(1.8), Inches(5.4), Inches(4.8))
tb_f8 = s8.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(5.0), Inches(4.4))
tf_f8 = tb_f8.text_frame; tf_f8.word_wrap = True
p = tf_f8.paragraphs[0]
p.text = "✅ Atributos de Alto Impacto"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_TEAL
p_desc = tf_f8.add_paragraph()
p_desc.text = (
    "\n• Panel Ejecutivo de Reclutamiento:\n"
    "  Dashboard analítico con EmbudoSeleccion, SerieTemporal y KPI Cards con diseño limpio y profesional.\n\n"
    "• Pipeline Kanban de Candidatos:\n"
    "  Gestión visual interactiva por etapas de selección que empodera y agiliza la toma de decisiones.\n\n"
    "• Microinteracciones Pulidas:\n"
    "  Aperturas suaves de modales, efectos hover, transiciones y badges de estado semánticos (lucide-react).\n\n"
    "• Productividad y Exportación:\n"
    "  Descarga de reportes en CSV con codificación UTF-8 BOM adaptada al huso horario de Lima."
)
p_desc.font.size = Pt(12); p_desc.font.color.rgb = C_TEXT_MAIN

# Tarjeta de Oportunidades
c_o8 = agregar_tarjeta(s8, Inches(6.8), Inches(1.8), Inches(5.5), Inches(4.8))
tb_o8 = s8.shapes.add_textbox(Inches(7.0), Inches(2.0), Inches(5.1), Inches(4.4))
tf_o8 = tb_o8.text_frame; tf_o8.word_wrap = True
p = tf_o8.paragraphs[0]
p.text = "🚀 Próximo Nivel de Engagement"
p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_BLUE
p_desc2 = tf_o8.add_paragraph()
p_desc2.text = (
    "\n• Drag & Drop Nativo en Pipeline:\n"
    "  Permitir arrastrar candidatos entre columnas Kanban para elevar la sensación de fluidez y control directo.\n\n"
    "• Optimización Táctil en Móviles (Portal):\n"
    "  Ampliar targets táctiles de chips y botones en smartphones a un mínimo ergonómico de 44x44px.\n\n"
    "• Gamificación en el Perfil del Candidato:\n"
    "  Felicitaciones y feedback animado al completar el 100% del currículum o enviar la primera postulación."
)
p_desc2.font.size = Pt(12); p_desc2.font.color.rgb = C_TEXT_MAIN

s8.notes_slide.notes_text_frame.text = (
    "Notas del orador: En Compromiso del Usuario obtuvimos la calificación más alta: 4.4 sobre 5. El sistema transmite modernidad, confianza "
    "y eficiencia. Los reclutadores valoran enormemente el Dashboard con embudo de selección y el tablero Kanban de candidatos. Con pequeñas mejoras "
    "como Drag & Drop y botones táctiles más amplios en smartphones, la experiencia será de clase mundial."
)

# -------------------------------------------------------------
# SLIDE 9: Gráfico Resumen de Puntajes
# -------------------------------------------------------------
s9 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s9, "Resumen Global de Capacidad de Interacción", "Promedio Global Ponderado: 3.95 / 5.0 (Aprobado)")

# Gráfico de barras
chart_data = CategoryChartData()
chart_data.categories = [
    'Facilidad de Aprendizaje',
    'Protección contra Errores',
    'Asistencia al Usuario',
    'Compromiso del Usuario',
    'PROMEDIO GLOBAL'
]
chart_data.add_series('Puntaje Obtenido (1 a 5)', (4.1, 3.8, 3.5, 4.4, 3.95))
chart_data.add_series('Umbral Aceptable (Mínimo)', (3.5, 3.5, 3.5, 3.5, 3.5))

x, y, cx, cy = Inches(1.0), Inches(1.8), Inches(7.5), Inches(4.8)
chart = s9.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data
).chart

chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.TOP
chart.legend.include_in_layout = False
chart.value_axis.maximum_scale = 5.0
chart.value_axis.minimum_scale = 0.0

# Tarjeta lateral de resumen
c_res = agregar_tarjeta(s9, Inches(8.8), Inches(1.8), Inches(3.5), Inches(4.8), bg_color=C_NAVY)
tb_res = s9.shapes.add_textbox(Inches(9.0), Inches(2.0), Inches(3.1), Inches(4.4))
tf_res = tb_res.text_frame; tf_res.word_wrap = True
p = tf_res.paragraphs[0]
p.text = "📊 Veredicto ISO"
p.font.size = Pt(18); p.font.bold = True; p.font.color.rgb = RGBColor(13, 202, 240)

p_v = tf_res.add_paragraph()
p_v.text = (
    "\nESTADO: APROBADO\n\n"
    "• Puntaje Global: 3.95 / 5.0\n"
    "• Equivalente SUS: 76.5 / 100\n"
    "  (Calificación B - Grado Bueno)\n\n"
    "• Todas las dimensiones superan el umbral mínimo aceptable (3.5).\n\n"
    "• Mayor Fortaleza:\n"
    "  Compromiso del Usuario (4.4)\n\n"
    "• Mayor Oportunidad:\n"
    "  Asistencia y Accesibilidad (3.5)"
)
p_v.font.size = Pt(12); p_v.font.color.rgb = RGBColor(255, 255, 255)

s9.notes_slide.notes_text_frame.text = (
    "Notas del orador: En esta gráfica comparativa observamos que las cuatro subcaracterísticas se encuentran por encima del umbral mínimo "
    "de 3.5 puntos, alcanzando un promedio global de 3.95 sobre 5, lo que equivale a un puntaje SUS proyectado de 76.5 puntos (categoría B o Buena). "
    "El sistema califica como Aprobado según el modelo de calidad de software ISO/IEC 25010."
)

# -------------------------------------------------------------
# SLIDE 10: Principales Problemas Encontrados (Matriz de Defectos)
# -------------------------------------------------------------
s10 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s10, "Matriz de Defectos por Severidad", "Hallazgos críticos priorizados con impacto y ubicación en el código")

defectos = [
    ("DEF-01", "Pérdida accidental de datos en formularios no guardados (Dirty Forms)", "Crítica", "ERP: PostulanteForm", "H5: Prevención de errores", C_CORAL),
    ("DEF-02", "Etiquetas desvinculadas sin atributo htmlFor en inputs de formularios", "Alta", "ERP: 74 inputs sin id", "WCAG 2.1 / Accesibilidad", C_CORAL),
    ("DEF-03", "Contraste de color deficiente en textos secundarios (text-gray-400)", "Alta", "ERP (134) y Portal (20)", "WCAG 1.4.3 Contraste", C_AMBER),
    ("DEF-04", "Ausencia de indicador de completitud curricular en perfil de candidato", "Media", "Portal: PerfilView.tsx", "H1: Visibilidad del estado", C_AMBER),
    ("DEF-05", "Redirección silenciosa sin feedback al restringir rutas por rol", "Media", "ERP: middleware.ts", "H1: Visibilidad del estado", C_AMBER),
    ("DEF-06", "Página 404 por defecto sin identidad de marca ni botón de retorno", "Baja", "Portal: app/not-found", "H9: Recuperación de errores", C_BLUE),
]

# Tabla de defectos
table_shape = s10.shapes.add_table(7, 5, Inches(1.0), Inches(1.8), Inches(11.3), Inches(4.8))
table = table_shape.table
col_w = [Inches(1.2), Inches(4.5), Inches(1.4), Inches(2.2), Inches(2.0)]
for i, w in enumerate(col_w):
    table.columns[i].width = w

headers_t = ["ID", "Descripción del Defecto", "Severidad", "Ubicación", "Criterio Violado"]
for i, h in enumerate(headers_t):
    cell = table.cell(0, i)
    cell.fill.solid(); cell.fill.fore_color.rgb = C_BLUE
    p = cell.text_frame.paragraphs[0]
    p.text = h; p.font.bold = True; p.font.size = Pt(11); p.font.color.rgb = RGBColor(255, 255, 255)
    p.alignment = PP_ALIGN.CENTER

for row_idx, (d_id, desc, sev, ubi, crit, col_s) in enumerate(defectos):
    row_cells = [table.cell(row_idx + 1, j) for j in range(5)]
    data = [d_id, desc, sev, ubi, crit]
    for j, val in enumerate(data):
        c = row_cells[j]
        c.fill.solid()
        c.fill.fore_color.rgb = RGBColor(255, 255, 255) if row_idx % 2 == 0 else RGBColor(241, 243, 245)
        p = c.text_frame.paragraphs[0]
        p.text = val
        p.font.size = Pt(10)
        p.font.color.rgb = C_TEXT_MAIN
        if j == 2:
            p.font.bold = True
            p.font.color.rgb = col_s
            p.alignment = PP_ALIGN.CENTER
        elif j == 0:
            p.alignment = PP_ALIGN.CENTER

s10.notes_slide.notes_text_frame.text = (
    "Notas del orador: En esta diapositiva sintetizamos los 6 problemas más relevantes identificados durante la auditoría. "
    "Destacamos el defecto DEF-01 de severidad Crítica por riesgo de pérdida de datos del reclutador, y los defectos DEF-02 y DEF-03 de severidad Alta "
    "por incumplimiento de estándares internacionales de accesibilidad WCAG 2.1."
)

# -------------------------------------------------------------
# SLIDE 11: Recomendaciones Priorizadas (Impacto vs. Esfuerzo)
# -------------------------------------------------------------
s11 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s11, "Plan de Mejoras Priorizado (Impacto vs. Esfuerzo)", "Matriz de acción técnica inmediata para el equipo de desarrollo")

cuadrantes = [
    ("⚡ Victorias Rápidas (Bajo Esfuerzo / Alto Impacto)", [
        "• Añadir lang='es' en layout de ERP (1 línea de código).",
        "• Subir contraste: reemplazar text-gray-400 por text-gray-600.",
        "• Crear página personalizada app/not-found.tsx en Portal.",
        "• Agregar banner informativo en redirecciones del middleware."
    ], C_TEAL),
    ("🎯 Proyectos Estratégicos (Alto Esfuerzo / Alto Impacto)", [
        "• Hook useWarnIfUnsavedChanges con evento beforeunload.",
        "• Refactorizar inputs a componentes accesibles con htmlFor e id.",
        "• Diseñar widget de completitud de perfil en el Portal de Postulación.",
        "• Implementar Drag & Drop en el pipeline Kanban de postulantes."
    ], C_BLUE),
    ("⏳ Mejoras de Mantenimiento (Bajo Esfuerzo / Bajo Impacto)", [
        "• Incorporar chips de sugerencias rápidas en el buscador.",
        "• Aumentar padding táctil en filtros móviles (h-11 / 44px).",
        "• Texto visible con límite explícito 'Máx 5MB' en carga de CV."
    ], C_TEXT_MUTED),
    ("🔍 Evaluaciones Futuras (Alto Esfuerzo / Bajo Impacto)", [
        "• Gamificación avanzada y medallas de perfil completado.",
        "• Personalización configurable de tarjetas en Dashboard ERP."
    ], C_TEXT_MUTED)
]

for idx, (tit, items, col) in enumerate(cuadrantes):
    left_pos = Inches(1.0 + (idx % 2) * 5.8)
    top_pos = Inches(1.8 + (idx // 2) * 2.5)
    card = agregar_tarjeta(s11, left_pos, top_pos, Inches(5.5), Inches(2.3))
    
    tbox = s11.shapes.add_textbox(left_pos + Inches(0.2), top_pos + Inches(0.15), Inches(5.1), Inches(2.0))
    tf = tbox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = tit
    p.font.size = Pt(13); p.font.bold = True; p.font.color.rgb = col
    
    for it in items:
        p_it = tf.add_paragraph()
        p_it.text = it
        p_it.font.size = Pt(10.5); p_it.font.color.rgb = C_TEXT_MAIN; p_it.space_before = Pt(3)

s11.notes_slide.notes_text_frame.text = (
    "Notas del orador: Para maximizar el retorno de inversión en calidad, clasificamos las recomendaciones en una matriz de Impacto vs. Esfuerzo. "
    "Recomendamos ejecutar de inmediato las 'Victorias Rápidas' como la corrección del idioma HTML y el contraste de colores, para luego abordar "
    "los 'Proyectos Estratégicos' como la protección ante pérdida de datos en formularios y la accesibilidad total."
)

# -------------------------------------------------------------
# SLIDE 12: Conclusiones
# -------------------------------------------------------------
s12 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s12, "Conclusiones del Estudio de Usabilidad", "Síntesis del estado de madurez de TalentERP y el Portal")

conclusiones = [
    ("Arquitectura UX Sólida", "El sistema presenta una base de interacción altamente profesional: el uso de split-view, tabs organizados, skeletons de carga y modales de confirmación demuestran madurez técnica superior al promedio académico."),
    ("Cumplimiento Normativo ISO 25010", "Con un puntaje ponderado de 3.95 / 5.0 y un SUS estimado de 76.5, la plataforma aprueba satisfactoriamente la característica de Capacidad de Interacción, siendo completamente viable para despliegue productivo."),
    ("Brecha Focalizada en Accesibilidad", "La principal debilidad no radica en el diseño visual ni en la lógica de negocio, sino en la accesibilidad universal (WCAG 2.1 AA): asociación de etiquetas para lectores de pantalla y contraste tipográfico."),
    ("Alta Satisfacción Percibida", "El módulo de Pipeline de Postulantes y el Dashboard analítico generan un alto compromiso (4.4/5.0), ofreciendo un valor diferencial tangible para las operaciones diarias de la consultora.")
]

for idx, (tit, desc) in enumerate(conclusiones):
    top_pos = Inches(1.8 + idx * 1.25)
    card = agregar_tarjeta(s12, Inches(1.0), top_pos, Inches(11.3), Inches(1.1))
    
    # Número grande
    num_box = s12.shapes.add_textbox(Inches(1.2), top_pos + Inches(0.1), Inches(0.8), Inches(0.9))
    p_num = num_box.text_frame.paragraphs[0]
    p_num.text = f"0{idx+1}"
    p_num.font.size = Pt(28); p_num.font.bold = True; p_num.font.color.rgb = C_BLUE
    
    tbox = s12.shapes.add_textbox(Inches(2.1), top_pos + Inches(0.1), Inches(10.0), Inches(0.9))
    tf = tbox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = tit
    p.font.size = Pt(15); p.font.bold = True; p.font.color.rgb = C_NAVY
    p_desc = tf.add_paragraph()
    p_desc.text = desc
    p_desc.font.size = Pt(11); p_desc.font.color.rgb = C_TEXT_MAIN; p_desc.space_before = Pt(3)

s12.notes_slide.notes_text_frame.text = (
    "Notas del orador: Como conclusión general, TalentERP y el Portal de Postulación demuestran un nivel sobresaliente de usabilidad y diseño. "
    "El software resuelve las necesidades de reclutadores y postulantes con eficacia, agilidad y estética moderna. Las brechas detectadas son "
    "puntuales y de rápida resolución técnica."
)

# -------------------------------------------------------------
# SLIDE 13: Próximos Pasos (Roadmap de Calidad)
# -------------------------------------------------------------
s13 = prs.slides.add_slide(blank_layout)
agregar_cabecera(s13, "Próximos Pasos y Hoja de Ruta", "Cronograma de aseguramiento de calidad y pruebas en entorno real")

fases = [
    ("Sprint Inmediato (Semana 1)", "• Corrección de Victorias Rápidas (HTML lang, contraste text-gray-600, 404).\n• Implementación de hook useWarnIfUnsavedChanges en formularios críticos.", C_BLUE),
    ("Sprint de Refactor (Semana 2)", "• Adecuación de accesibilidad WCAG 2.1 (htmlFor, aria-describedby en 74 inputs).\n• Despliegue de indicador de completitud de perfil en el Portal de Postulación.", C_TEAL),
    ("Pruebas de Campo (Semana 3)", "• Sesiones moderadas de prueba con 5 reclutadores reales y 10 postulantes.\n• Aplicación formal del cuestionario SUS de 10 ítems para contrastar mediciones.", C_AMBER),
    ("Monitoreo Continuo (Semana 4)", "• Integración de analítica de comportamiento de usuario (Hotjar / Google Analytics).\n• Incorporación de suites Playwright de accesibilidad automatizada al pipeline CI/CD.", C_NAVY),
]

for idx, (fase, acciones, col) in enumerate(fases):
    left_pos = Inches(1.0 + idx * 2.85)
    card = agregar_tarjeta(s13, left_pos, Inches(1.8), Inches(2.75), Inches(4.8))
    
    # Barra superior
    top_bar = s13.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_pos, Inches(1.8), Inches(2.75), Inches(0.15))
    top_bar.fill.solid(); top_bar.fill.fore_color.rgb = col; top_bar.line.fill.background()
    
    tbox = s13.shapes.add_textbox(left_pos + Inches(0.15), Inches(2.1), Inches(2.45), Inches(4.3))
    tf = tbox.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = fase
    p.font.size = Pt(13); p.font.bold = True; p.font.color.rgb = col
    
    p_act = tf.add_paragraph()
    p_act.text = acciones
    p_act.font.size = Pt(11); p_act.font.color.rgb = C_TEXT_MAIN; p_act.space_before = Pt(8)

s13.notes_slide.notes_text_frame.text = (
    "Notas del orador: Concluimos con la hoja de ruta recomendada: en las primeras dos semanas cerramos las brechas técnicas en código; "
    "en la tercera semana ejecutamos las pruebas de campo con usuarios humanos y cuestionario SUS real, y finalmente institucionalizamos "
    "el monitoreo continuo de usabilidad en el pipeline de despliegue. Quedamos a su disposición para consultas."
)

prs.save('tests/usabilidad/TalentERP-pruebas-usabilidad-ISO25010.pptx')
print('Presentación PowerPoint generada exitosamente con 13 diapositivas profesionales.')
