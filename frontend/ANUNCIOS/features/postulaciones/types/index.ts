export type EstadoProceso = 'En proceso' | 'Finalizado' | 'Cancelado';

export interface Postulacion {
  id: string;
  anuncioId: string;
  cargo: string;
  empresa: string;
  fechaPublicacion: string;
  fechaCierre: string;
  estadoProceso: EstadoProceso;
  pasoActual: number; // 1: Postulado, 2: Evaluación, 3: Entrevista, 4: Preseleccionado, 5: Contratado
}
