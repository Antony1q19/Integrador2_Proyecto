// features/postulaciones/types/index.ts

export type EstadoProceso = 'En proceso' | 'Finalizado' | 'Cancelado';

export type EstadoActualBackend =
  | 'POSTULADO'
  | 'EN_EVALUACION'
  | 'ENTREVISTA'
  | 'PRESELECCIONADO'
  | 'CONTRATADO'
  | 'DESCARTADO';

// Formato que devuelve el backend (servicio-procesos-seleccion).
export interface PostulacionApi {
  id: string;
  postulanteId: string;
  anuncioId: number;
  estadoActual: EstadoActualBackend;
  fechaPostulacion: string;
  // Solo etapa y fecha: los comentarios internos y el nombre de quien hizo cada cambio
  // son datos del ERP y el backend no se los entrega al postulante.
  historialEstados: Array<{
    id: string;
    estado: string;
    fecha: string;
  }>;
}

// Formato que usa la UI (PostulacionCard).
export interface Postulacion {
  id: string;
  anuncioId: string;
  cargo: string;
  empresa: string;
  fechaPublicacion: string;
  fechaCierre: string;
  estadoProceso: EstadoProceso;
  pasoActual: number; // 1-5
  // Extras para mostrar en el card:
  estadoActual?: EstadoActualBackend;
  fechaPostulacion?: string;
}