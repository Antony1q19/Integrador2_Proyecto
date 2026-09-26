// features/entrevistas/types/entrevista.types.ts
//
// Forma de las entrevistas (GET /entrevistas, servicio-procesos-seleccion).
export const MODALIDADES_ENTREVISTA = ["Presencial", "Virtual", "Telefónica"] as const;
export type ModalidadEntrevista = (typeof MODALIDADES_ENTREVISTA)[number];

export const ESTADOS_ENTREVISTA = ["Programada", "Realizada", "Cancelada", "No asistió"] as const;
export type EstadoEntrevista = (typeof ESTADOS_ENTREVISTA)[number];

export const RESULTADOS_ENTREVISTA = ["Aprobada", "No aprobada", "Pendiente de decisión"] as const;
export type ResultadoEntrevista = (typeof RESULTADOS_ENTREVISTA)[number];

export interface Entrevista {
  id: string;
  procesoId: string;
  postulanteId: string;
  anuncioId: number;
  fechaHora: string; // instante ISO (ej. "2026-10-05T14:00:00Z"); se muestra en hora de Lima
  duracionMin: number;
  modalidad: ModalidadEntrevista;
  lugarOEnlace: string | null;
  entrevistador: string;
  estado: EstadoEntrevista;
  resultado: ResultadoEntrevista | null;
  notas: string | null;
  creadoPor: string;
  fechaCreacion: string;
}

// Lo que se envía al programar. `fechaHora` es la hora LOCAL de Perú tal como la da <input type="datetime-local">
// ("2026-10-05T09:00"): el servidor la interpreta como hora de Lima.
export interface NuevaEntrevista {
  postulanteId: string;
  anuncioId: number;
  fechaHora: string;
  duracionMin: number;
  modalidad: ModalidadEntrevista;
  lugarOEnlace?: string;
  entrevistador?: string; // si se deja vacío, entrevista quien la programa
  notas?: string;
}

export type CambiosEntrevista = Partial<
  Pick<Entrevista, "duracionMin" | "modalidad" | "lugarOEnlace" | "entrevistador" | "estado" | "resultado" | "notas"> & {
    fechaHora: string;
  }
>;

export interface FiltrosEntrevistas {
  postulanteId?: string;
  anuncioId?: number;
  estado?: EstadoEntrevista;
  desde?: string; // AAAA-MM-DD
  hasta?: string;
}
