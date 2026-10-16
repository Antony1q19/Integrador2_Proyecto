// features/comunicaciones/plantillasSistema.ts
//
// Catálogo ÚNICO de mensajes del proceso de selección (de la postulación al seguimiento post-ingreso).
// De aquí salen las plantillas de WhatsApp que se crean en Meta (Comunicaciones > Plantillas >
// "Crear plantillas del sistema"): son las que se pueden enviar aunque el postulante no haya escrito
// en 24 horas. (Los textos rápidos del chat son otra cosa: se editan en el ERP y se guardan en la base.)
//
// Reglas de Meta para que las apruebe: nombre en minúsculas con guion bajo, variables {{1}}, {{2}}...
// seguidas, un ejemplo por variable, y el texto no puede empezar ni terminar con una variable.

export type EtapaPlantilla = "general" | "entrevista" | "documentos" | "seguimiento" | "contratacion";

export interface PlantillaSistema {
  nombre: string;            // nombre en Meta
  titulo: string;            // cómo se ve en el ERP
  descripcion: string;
  etapa: EtapaPlantilla;
  cuerpo: string;            // con {{1}}, {{2}}...
  variables: string[];       // qué va en cada {{n}}, en orden (ej. "nombre", "puesto")
  ejemplos: string[];        // un ejemplo por variable (Meta los pide para revisarla)
}

export const IDIOMA_PLANTILLAS_SISTEMA = "es";

export const PLANTILLAS_SISTEMA: PlantillaSistema[] = [
  {
    nombre: "talenterp_postulacion_recibida",
    titulo: "Postulación recibida",
    descripcion: "Confirma que recibimos su postulación",
    etapa: "general",
    cuerpo:
      "Hola {{1}}, recibimos tu postulación al puesto de {{2}}. Nuestro equipo de selección revisará tu perfil y te escribiremos por este medio con los siguientes pasos.",
    variables: ["nombre", "puesto"],
    ejemplos: ["María", "Asistente administrativo"],
  },
  {
    nombre: "talenterp_entrevista_programada",
    titulo: "Entrevista programada",
    descripcion: "Invita a la entrevista con fecha, hora y modalidad",
    etapa: "entrevista",
    cuerpo:
      "Hola {{1}}, te invitamos a una entrevista para el puesto de {{2}} el {{3}} a las {{4}}. Modalidad: {{5}}. Por favor confirma tu asistencia respondiendo este mensaje.",
    variables: ["nombre", "puesto", "fecha", "hora", "modalidad"],
    ejemplos: ["María", "Asistente administrativo", "lunes 20 de octubre", "10:00 a. m.", "virtual, el enlace llegará a tu correo"],
  },
  {
    nombre: "talenterp_recordatorio_entrevista",
    titulo: "Recordatorio de entrevista",
    descripcion: "Recuerda la entrevista un día antes",
    etapa: "entrevista",
    cuerpo:
      "Hola {{1}}, te recordamos tu entrevista para el puesto de {{2}} programada para el {{3}} a las {{4}}. Si tienes algún inconveniente, avísanos por este medio.",
    variables: ["nombre", "puesto", "fecha", "hora"],
    ejemplos: ["María", "Asistente administrativo", "lunes 20 de octubre", "10:00 a. m."],
  },
  {
    nombre: "talenterp_solicitud_documentos",
    titulo: "Solicitud de documentos",
    descripcion: "Pide documentos para continuar el proceso",
    etapa: "documentos",
    cuerpo:
      "Hola {{1}}, para continuar con tu proceso para el puesto de {{2}} necesitamos que nos envíes: {{3}}. Puedes responder a este mensaje con los archivos o subirlos desde tu perfil en el portal de empleos.",
    variables: ["nombre", "puesto", "documentos"],
    ejemplos: ["María", "Asistente administrativo", "copia de DNI y certificado de estudios"],
  },
  {
    nombre: "talenterp_avance_proceso",
    titulo: "Avance del proceso",
    descripcion: "Informa que pasó a una nueva etapa",
    etapa: "seguimiento",
    cuerpo:
      "Hola {{1}}, tu proceso de selección para el puesto de {{2}} avanzó a la etapa de {{3}}. Pronto te contactaremos con más detalles.",
    variables: ["nombre", "puesto", "etapa"],
    ejemplos: ["María", "Asistente administrativo", "evaluación técnica"],
  },
  {
    nombre: "talenterp_resultado_no_seleccionado",
    titulo: "No seleccionado",
    descripcion: "Comunica con respeto que no continúa",
    etapa: "seguimiento",
    cuerpo:
      "Hola {{1}}, gracias por tu interés en el puesto de {{2}}. En esta ocasión decidimos continuar con otros candidatos. Guardaremos tu perfil para futuras oportunidades.",
    variables: ["nombre", "puesto"],
    ejemplos: ["María", "Asistente administrativo"],
  },
  {
    nombre: "talenterp_oferta_laboral",
    titulo: "Oferta laboral",
    descripcion: "Informa que fue seleccionado(a)",
    etapa: "contratacion",
    cuerpo:
      "Hola {{1}}, nos complace informarte que fuiste seleccionado(a) para el puesto de {{2}} en {{3}}. Te escribiremos para coordinar la firma del contrato y tu fecha de ingreso.",
    variables: ["nombre", "puesto", "empresa"],
    ejemplos: ["María", "Asistente administrativo", "Comercial Andina S.A.C."],
  },
  {
    nombre: "talenterp_confirmacion_ingreso",
    titulo: "Confirmación de ingreso",
    descripcion: "Confirma fecha y lugar del primer día",
    etapa: "contratacion",
    cuerpo:
      "Hola {{1}}, te confirmamos tu fecha de ingreso como {{2}} el {{3}}. Ese día preséntate en {{4}}. ¡Te damos la bienvenida al equipo!",
    variables: ["nombre", "puesto", "fecha", "lugar"],
    ejemplos: ["María", "Asistente administrativo", "lunes 3 de noviembre a las 8:30 a. m.", "Av. Javier Prado 123, San Isidro"],
  },
  {
    nombre: "talenterp_seguimiento_postingreso",
    titulo: "Seguimiento post-ingreso",
    descripcion: "Control a los 30, 60 o 90 días",
    etapa: "seguimiento",
    cuerpo:
      "Hola {{1}}, ya cumpliste {{2}} días en tu nuevo puesto de {{3}}. Nos gustaría saber cómo te va: responde este mensaje y te contactaremos para una breve conversación.",
    variables: ["nombre", "días", "puesto"],
    ejemplos: ["María", "30", "Asistente administrativo"],
  },
  {
    nombre: "talenterp_reabrir_conversacion",
    titulo: "Retomar conversación",
    descripcion: "Para volver a escribirle si pasaron más de 24 horas",
    etapa: "general",
    cuerpo:
      "Hola {{1}}, te escribimos del equipo de selección sobre tu postulación al puesto de {{2}}. Responde a este mensaje para continuar la conversación.",
    variables: ["nombre", "puesto"],
    ejemplos: ["María", "Asistente administrativo"],
  },
];

export function buscarPlantillaSistema(nombre: string): PlantillaSistema | undefined {
  return PLANTILLAS_SISTEMA.find((p) => p.nombre === nombre);
}
