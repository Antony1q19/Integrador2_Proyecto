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
  // IDs de Postulante asociados (solo en modo mock). Con el backend real no viene: esa relación
  // vive en las postulaciones (servicio-procesos-seleccion → `procesosPostulacion` del postulante).
  postulantesAsociadosIds?: string[];
}