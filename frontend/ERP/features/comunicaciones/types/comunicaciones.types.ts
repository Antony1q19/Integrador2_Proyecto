// features/comunicaciones/types/comunicaciones.types.ts

export type EstadoMensaje = "enviado" | "entregado" | "leido" | "fallido";

export interface Contacto {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  avatar?: string;
  ultimoMensaje?: string;
  ultimaActividad?: string;
  noLeidos: number;
  estado: "en_linea" | "ausente" | "desconectado";
}

export interface Mensaje {
  id: string;
  contactoId: string;
  remitente: "yo" | "contacto";
  texto: string;
  fecha: string; // ISO datetime
  estado: EstadoMensaje;
  esPlantilla?: boolean;
}

export interface Conversacion {
  contacto: Contacto;
  mensajes: Mensaje[];
  ultimoMensaje: Mensaje;
}

export interface PlantillaMensaje {
  id: string;
  nombre: string;
  descripcion: string;
  contenido: string;
  categoria: "entrevista" | "documentos" | "seguimiento" | "contratacion" | "general";
}

// Plantillas predefinidas
export const PLANTILLAS: PlantillaMensaje[] = [
  {
    id: "1",
    nombre: "Confirmación de Entrevista",
    descripcion: "Confirma fecha y hora de entrevista",
    categoria: "entrevista",
    contenido: "Estimado/a {nombre}, confirmamos su entrevista para el día {fecha} a las {hora}. Por favor, confirmar asistencia.",
  },
  {
    id: "2",
    nombre: "Solicitud de Documentos",
    descripcion: "Solicita documentos adicionales al postulante",
    categoria: "documentos",
    contenido: "Estimado/a {nombre}, para continuar con el proceso, necesitamos que nos envíe los siguientes documentos: {documentos}.",
  },
  {
    id: "3",
    nombre: "Seguimiento de Proceso",
    descripcion: "Actualiza el estado del proceso al postulante",
    categoria: "seguimiento",
    contenido: "Estimado/a {nombre}, le informamos que su proceso de selección ha avanzado a la etapa de {etapa}.",
  },
  {
    id: "4",
    nombre: "Oferta de Contratación",
    descripcion: "Comunica la oferta de contratación",
    categoria: "contratacion",
    contenido: "Estimado/a {nombre}, nos complace ofrecerle el puesto de {cargo}. Los detalles de la oferta son: {detalles}.",
  },
];