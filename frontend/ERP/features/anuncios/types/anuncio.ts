export type EstadoAnuncio = "Abierto" | "En proceso" | "Cerrado";

export interface Anuncio {
  id: number;
  cargo: string;
  descripcion: string | null;
  requisitos: string | null;
  numeroVacantes: number;
  salarioMin: number | null;
  salarioMax: number | null;
  fechaLimite: string; // formato ISO: "2025-12-31"
  estado: EstadoAnuncio;
  empresaId: number;
  empresaRazonSocial: string; // desnormalizado para no tener que buscar la empresa cada vez que listamos
  fechaCreacion: string;
  //postulantesAsociadosIds: string[]; // IDs de Postulante asociados a este anuncio
}