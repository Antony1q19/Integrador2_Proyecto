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
  // false = escribió un número que no es de ningún postulante registrado.
  registrado?: boolean;
  // Cuándo escribió el postulante por última vez (la ventana de 24 h de WhatsApp cuenta desde ahí).
  ultimoEntrante?: string;
}

export interface Mensaje {
  id: string;
  contactoId: string;
  remitente: "yo" | "contacto";
  texto: string;
  fecha: string; // ISO datetime
  estado: EstadoMensaje;
  error?: string | null; // por qué WhatsApp no lo entregó (si estado == "fallido")
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
  categoria: string; // entrevista | documentos | seguimiento | contratacion | general
}
