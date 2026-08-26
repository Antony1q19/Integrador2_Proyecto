export type EstadoAnuncio = "Abierto" | "En proceso" | "Cerrado";

export interface Anuncio {
  id: number;
  cargo: string;
  descripcion: string;
  requisitos: string;
  numeroVacantes: number;
  salarioMin: number;
  salarioMax: number;
  fechaLimite: string; // formato ISO: "2025-12-31"
  estado: EstadoAnuncio;
  empresaId: number;
  empresaRazonSocial: string; // desnormalizado para no tener que buscar la empresa cada vez que listamos
  fechaCreacion: string;
  postulantesAsociadosIds: string[]; // IDs de Postulante asociados a este anuncio
}