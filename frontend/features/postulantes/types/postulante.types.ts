// features/postulantes/types/postulante.types.ts
//
// Fuente de verdad del modelo "Postulante". Pensado para calzar con una
// respuesta típica de una API Spring Boot (id numérico tipo Long, fechas en
// formato ISO 8601 string). Cuando se integre el backend Java, este archivo
// no debería requerir cambios de forma, solo ajustar nombres si el DTO
// difiere.

export type EstadoProceso =
  | "POSTULADO"
  | "EN_EVALUACION"
  | "ENTREVISTA"
  | "PRESELECCIONADO"
  | "CONTRATADO"
  | "DESCARTADO";

export const ORDEN_PIPELINE: EstadoProceso[] = [
  "POSTULADO",
  "EN_EVALUACION",
  "ENTREVISTA",
  "PRESELECCIONADO",
  "CONTRATADO",
];

export interface DatosPersonales {
  nombres: string;
  apellidos: string;
  documentoTipo: "DNI" | "CE" | "PASAPORTE";
  documentoNumero: string;
  email: string;
  telefono: string;
  fechaNacimiento: string; // ISO date
  direccion?: string;
  cargoPostulado: string;
  empresaCliente: string;
  fuenteReclutamiento?: string;
}

export interface DocumentoPostulante {
  id: string;
  nombreArchivo: string;
  tipo: "CV" | "DNI" | "CERTIFICADO" | "OTRO";
  tamanioKb: number;
  fechaCarga: string; // ISO datetime
  url?: string; // vendrá del backend/storage real
}

export interface Evaluacion {
  id: string;
  tipo: "ENTREVISTA_RRHH" | "PRUEBA_TECNICA" | "ENTREVISTA_SUPERVISOR" | "PSICOLOGICA";
  evaluador: string;
  fecha: string; // ISO date
  puntaje: number; // 0-100
  comentarios: string;
}

export interface HistorialEstado {
  id: string;
  estado: EstadoProceso;
  fecha: string; // ISO datetime
  usuarioResponsable: string;
  comentario?: string;
}

export interface Postulante {
  id: string;
  datosPersonales: DatosPersonales;
  estadoActual: EstadoProceso;
  documentos: DocumentoPostulante[];
  evaluaciones: Evaluacion[];
  historialEstados: HistorialEstado[];
  fechaRegistro: string; // ISO datetime
}
