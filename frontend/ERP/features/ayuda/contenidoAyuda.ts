// features/ayuda/contenidoAyuda.ts
//
// Contenido de la página "Ayuda" del ERP: guía rápida por módulo, roles y preguntas frecuentes.
// Al agregar o cambiar una funcionalidad, actualiza también su sección aquí.

export interface SeccionAyuda {
  id: string;
  titulo: string;
  ruta?: string; // pantalla del ERP a la que se refiere (para el botón "Ir")
  resumen: string;
  pasos: string[];
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export const SECCIONES_AYUDA: SeccionAyuda[] = [
  {
    id: "postulantes",
    titulo: "Postulantes",
    ruta: "/postulantes",
    resumen: "La base de candidatos: datos personales, documentos (CV, DNI), evaluaciones y dónde ha postulado.",
    pasos: [
      "Usa el buscador y los filtros para encontrar a un postulante por nombre, documento o estado.",
      "\"Nuevo postulante\" registra a alguien a mano; los que se registran en el portal de empleos aparecen solos.",
      "En su ficha, las pestañas muestran datos, documentos, evaluaciones, postulaciones, entrevistas y contratación.",
      "\"Enviar WhatsApp\" abre (o crea) el chat con el postulante en Comunicaciones.",
    ],
  },
  {
    id: "pipeline",
    titulo: "Pipeline de selección",
    ruta: "/postulantes/pipeline",
    resumen: "Las postulaciones como tarjetas por etapa: Postulado → En evaluación → Entrevista → Preseleccionado → Contratado.",
    pasos: [
      "Arrastra una tarjeta a otra columna para cambiar su etapa; el cambio queda en el historial.",
      "Al soltarla en \"Contratado\" se pide registrar la contratación (fecha de ingreso, contrato, salario).",
      "\"Descartado\" saca la postulación del proceso sin borrarla.",
    ],
  },
  {
    id: "entrevistas",
    titulo: "Entrevistas",
    ruta: "/entrevistas",
    resumen: "Programar, reprogramar y cerrar entrevistas (presencial, virtual o telefónica).",
    pasos: [
      "Al programar la primera entrevista, la postulación pasa sola a la etapa \"Entrevista\".",
      "Al cerrarla, registra si se realizó, se canceló o no asistió, y el resultado.",
    ],
  },
  {
    id: "contrataciones",
    titulo: "Contrataciones y seguimiento",
    ruta: "/contrataciones",
    resumen: "Los ingresos y sus controles post-ingreso a los 30, 60 y 90 días.",
    pasos: [
      "Estados: Por ingresar → Activo → Finalizado / Cancelado.",
      "Cada control se registra como Satisfactorio, Con observaciones o Insatisfactorio; un control vencido aparece resaltado.",
    ],
  },
  {
    id: "comunicaciones",
    titulo: "Comunicaciones (WhatsApp)",
    ruta: "/comunicaciones",
    resumen: "Chats de WhatsApp con los postulantes, en tiempo casi real, con avisos de mensajes nuevos en todo el ERP.",
    pasos: [
      "Los ✓ indican el estado: ✓ enviado, ✓✓ entregado, ✓✓ azul leído. Si un mensaje no llega, aparece el motivo en rojo.",
      "WhatsApp solo deja escribir libremente hasta 24 horas después del último mensaje del postulante; el encabezado del chat te dice hasta cuándo.",
      "Pasadas las 24 horas (o si el postulante aún no te escribió), usa \"Retomar chat\": cuando responda, se reabre la conversación.",
      "El botón \"Plantillas\" inserta textos listos (Admin y RRHH pueden editarlos). {nombre} se completa solo; completa lo demás antes de enviar.",
      "Un número que no es de ningún postulante aparece como \"No registrado\"; al abrir el chat desde la ficha del postulante, se le asocia.",
    ],
  },
  {
    id: "plantillas",
    titulo: "Plantillas de WhatsApp",
    ruta: "/comunicaciones/plantillas",
    resumen: "Las plantillas aprobadas por Meta (las únicas que se pueden enviar fuera de la ventana de 24 h) y las plantillas rápidas del chat.",
    pasos: [
      "Una plantilla nueva queda \"En revisión\" hasta que Meta la aprueba; usa \"Actualizar\" para ver su estado.",
      "Las de marketing solo se envían a postulantes que aceptaron comunicaciones comerciales.",
    ],
  },
  {
    id: "anuncios",
    titulo: "Anuncios y empresas",
    ruta: "/anuncios",
    resumen: "Las vacantes que piden las empresas clientes. Los anuncios abiertos se publican en el portal de empleos.",
    pasos: [
      "Crea la empresa cliente y luego sus anuncios (cargo, vacantes, requisitos, salario).",
      "Al cubrirse todas las vacantes, el anuncio se cierra solo.",
    ],
  },
  {
    id: "dashboard",
    titulo: "Dashboard",
    ruta: "/dashboard",
    resumen: "Indicadores del proceso: postulaciones, embudo por etapa, tiempos de contratación, rendimiento por empresa.",
    pasos: [
      "Filtra por rango de fechas y empresa; exporta las tablas a CSV.",
      "Las fechas se muestran en hora de Perú.",
    ],
  },
];

export const ROLES_AYUDA = [
  { rol: "Admin", puede: "Todo: usuarios, empresas, anuncios, selección, WhatsApp y plantillas. Ve todas las empresas." },
  { rol: "RRHH", puede: "Gestiona postulantes, selección y WhatsApp (envía y edita plantillas). Solo ve sus empresas asignadas." },
  { rol: "Supervisor", puede: "Ve el Dashboard, gestiona anuncios y edita empresas. En WhatsApp solo lee. Solo ve sus empresas asignadas." },
];

export const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  {
    pregunta: "¿Por qué un mensaje de WhatsApp aparece como \"No entregado\"?",
    respuesta:
      "El motivo aparece debajo del mensaje. Lo más común: pasaron más de 24 horas desde el último mensaje del postulante (usa \"Retomar chat\") o el número no tiene WhatsApp.",
  },
  {
    pregunta: "No veo a un postulante o una empresa que sí existe.",
    respuesta:
      "RRHH y Supervisor solo ven las empresas que un Admin les asignó (y sus anuncios, postulaciones y postulantes). Pide al Admin que te la asigne en Perfil.",
  },
  {
    pregunta: "Entré con una contraseña temporal y solo puedo ver mi perfil.",
    respuesta: "Por seguridad, primero debes cambiar la contraseña temporal en Perfil. Después tendrás acceso a todo según tu rol.",
  },
  {
    pregunta: "¿Qué archivos puedo subir como documentos?",
    respuesta: "PDF, JPG o PNG de hasta 5 MB.",
  },
  {
    pregunta: "Me sacó del sistema.",
    respuesta: "La sesión dura 1 hora. También se cierra si un Admin cambia tu rol, tu contraseña o suspende tu cuenta.",
  },
  {
    pregunta: "Recibí un aviso de mensaje nuevo, ¿cómo lo abro?",
    respuesta: "Haz clic en el aviso (abajo a la derecha): te lleva directo a ese chat. El número verde del menú es el total de mensajes sin leer.",
  },
];
