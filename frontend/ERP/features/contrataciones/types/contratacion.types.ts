// features/contrataciones/types/contratacion.types.ts
//
// Forma de las contrataciones y sus seguimientos post-ingreso (servicio-procesos-seleccion).
export const TIPOS_CONTRATO = ["Plazo fijo", "Plazo indeterminado", "Locación de servicios", "Prácticas", "Otro"] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const ESTADOS_CONTRATACION = ["Por ingresar", "Activo", "Finalizado", "Cancelado"] as const;
export type EstadoContratacion = (typeof ESTADOS_CONTRATACION)[number];

export const ESTADOS_SEGUIMIENTO = ["Pendiente", "Realizado", "Omitido"] as const;
export type EstadoSeguimiento = (typeof ESTADOS_SEGUIMIENTO)[number];

export const VALORACIONES_SEGUIMIENTO = ["Satisfactorio", "Con observaciones", "Insatisfactorio"] as const;
export type ValoracionSeguimiento = (typeof VALORACIONES_SEGUIMIENTO)[number];

export interface Seguimiento {
  id: string;
  contratacionId: string;
  postulanteId: string;
  anuncioId: number;
  hitoDias: number; // 30, 60, 90 (o el de un control adicional)
  fechaProgramada: string; // AAAA-MM-DD
  fechaRealizada: string | null;
  estado: EstadoSeguimiento;
  valoracion: ValoracionSeguimiento | null;
  observaciones: string | null;
  realizadoPor: string | null;
  vencido: boolean; // sigue "Pendiente" y su fecha ya pasó
}

export interface Contratacion {
  id: string;
  procesoId: string;
  postulanteId: string;
  anuncioId: number;
  fechaIngreso: string; // AAAA-MM-DD
  cargo: string;
  tipoContrato: TipoContrato;
  salario: number | null;
  moneda: string;
  estado: EstadoContratacion;
  observaciones: string | null;
  creadoPor: string;
  fechaCreacion: string;
  seguimientos: Seguimiento[];
}

export interface NuevaContratacion {
  postulanteId: string;
  anuncioId: number;
  fechaIngreso: string;
  cargo: string;
  tipoContrato: TipoContrato;
  salario?: number | null;
  moneda?: string;
  observaciones?: string;
}

export type CambiosContratacion = Partial<
  Pick<Contratacion, "fechaIngreso" | "cargo" | "tipoContrato" | "salario" | "moneda" | "estado" | "observaciones">
>;

export interface CambiosSeguimiento {
  estado?: EstadoSeguimiento;
  valoracion?: ValoracionSeguimiento;
  fechaRealizada?: string;
  fechaProgramada?: string;
  observaciones?: string;
}

export interface FiltrosContrataciones {
  postulanteId?: string;
  anuncioId?: number;
  estado?: EstadoContratacion;
}
