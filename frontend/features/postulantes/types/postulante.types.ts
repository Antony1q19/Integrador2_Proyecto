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

// Competencias evaluadas en la entrevista de RRHH (HU-08). Cada una se
// califica en escala 1-5. Si se agrega/quita una competencia, el backend
// Java deberá reflejar el mismo set de claves en su DTO.
export interface CompetenciasEvaluacion {
  comunicacionEfectiva: number; // 1-5
  orientacionCliente: number; // 1-5
  responsabilidad: number; // 1-5
  adaptabilidadFlexibilidad: number; // 1-5
  toleranciaPresion: number; // 1-5
  dinamismoEnergia: number; // 1-5
}

export type ResultadoEvaluacion = "APTO" | "NO_APTO";

export interface Evaluacion {
  id: string;
  evaluador: string;
  fecha: string; // ISO date
  competencias: CompetenciasEvaluacion;
  puntajeTotal: number; // 0-100, calculado a partir del promedio de competencias
  resultado: ResultadoEvaluacion; // calculado automáticamente (ver features/postulantes/utils/evaluacion.ts)
  carneSanidad: boolean; // cuenta con carné de sanidad vigente
  antecedentesPenales: boolean; // registra antecedentes penales
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
