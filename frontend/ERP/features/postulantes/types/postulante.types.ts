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

// Datos que el propio postulante completa al crear su perfil en la bolsa de
// trabajo (ver la app ANUNCIOS). RRHH solo los visualiza aquí, en la ficha.
export interface FormacionAcademica {
  id: string;
  institucion: string;
  titulo: string;
  nivel: "SECUNDARIA" | "TECNICO" | "UNIVERSITARIO" | "POSTGRADO" | "OTRO";
  fechaInicio: string; // yyyy-mm
  fechaFin?: string; // vacío si "enCurso"
  enCurso: boolean;
}

export interface IdiomaPostulante {
  id: string;
  nombre: string;
  nivel: "BASICO" | "INTERMEDIO" | "AVANZADO" | "NATIVO";
}

export interface ExperienciaLaboral {
  id: string;
  empresa: string;
  cargo: string;
  fechaInicio: string; // yyyy-mm
  fechaFin?: string; // vacío si "actualidad"
  actualidad: boolean;
  descripcion?: string;
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
  resultado: ResultadoEvaluacion; // calculado automáticamente a partir solo del puntaje (ver features/postulantes/utils/evaluacion.ts)
  comentarios: string;
}

export interface HistorialEstado {
  id: string;
  estado: EstadoProceso;
  fecha: string; // ISO datetime
  usuarioResponsable: string;
  comentario?: string;
}

export type ResultadoPostulacion = "CONTRATADO" | "DESCARTADO";

export interface Postulante {
  id: string;
  datosPersonales: DatosPersonales;
  estadoActual: EstadoProceso;
  documentos: DocumentoPostulante[];
  evaluaciones: Evaluacion[];
  historialEstados: HistorialEstado[];
  fechaRegistro: string; // ISO datetime
  formacionAcademica: FormacionAcademica[];
  idiomas: IdiomaPostulante[];
  experiencia: ExperienciaLaboral[];
  // Resultado final por cada anuncio al que se presentó (clave = id del
  // anuncio, como string). Es independiente de `estadoActual`: un mismo
  // postulante puede postular a varios anuncios a la vez y terminar
  // contratado en uno y descartado en otro. `estadoActual` sigue
  // reflejando el proceso "principal" que RRHH sigue en el pipeline; este
  // mapa resuelve el desenlace de cada postulación individual (ver la
  // pestaña "Dónde ha postulado", en PostulacionesTab.tsx).
  resultadosPostulacion: Record<string, ResultadoPostulacion>;
}

// ============================================================
// TIPOS PARA EL FORMULARIO DE NUEVO POSTULANTE
// ============================================================

export interface PostulanteFormData {
  // Datos Personales
  nombres: string;
  apellidos: string;
  documentoTipo: "DNI" | "CE" | "PASAPORTE";
  documentoNumero: string;
  fechaNacimiento: string;
  
  // Datos de Contacto
  email: string;
  telefono: string;
  direccion?: string;
  
  // Datos de Postulación
  cargoPostulado: string;
  empresaCliente: string;
  fuenteReclutamiento?: string;
}

export interface PostulanteFormErrors {
  nombres?: string;
  apellidos?: string;
  documentoTipo?: string;
  documentoNumero?: string;
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  cargoPostulado?: string;
  empresaCliente?: string;
  fuenteReclutamiento?: string;
  general?: string;
}

export const FUENTES_RECLUTAMIENTO = [
  "LinkedIn",
  "Bolsa de trabajo",
  "Referido",
  "Portal de empleo",
  "Redes sociales",
  "Universidad",
  "Otro",
] as const;

export const TIPOS_DOCUMENTO = [
  "DNI",
  "CE",
  "PASAPORTE",
] as const;