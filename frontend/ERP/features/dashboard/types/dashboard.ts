// features/dashboard/types/dashboard.ts
//
// Forma de la respuesta de GET /dashboard (servicio-procesos-seleccion, ver domain/dashboard.py).
import { EstadoProceso } from "@/features/postulantes/types/postulante.types";

export type Granularidad = "dia" | "semana" | "mes";

export interface ResumenDashboard {
  postulaciones: number;
  postulantesUnicos: number;
  enProceso: number;
  contratados: number;
  descartados: number;
  tasaContratacion: number; // %
  tasaDescarte: number; // %
  diasPromedioContratacion: number | null;
  anunciosActivos: number;
  vacantesActivas: number;
  vacantesCubiertas: number;
  coberturaVacantes: number; // %
  evaluaciones: number;
  puntajePromedio: number | null;
  porcentajeApto: number; // %
}

export interface PuntoSerie {
  fecha: string; // AAAA-MM-DD (inicio del día, semana o mes)
  postulaciones: number;
  contrataciones: number;
}

export interface FilaEmpresa {
  empresaId: number;
  razonSocial: string;
  anunciosActivos: number;
  vacantes: number;
  postulaciones: number;
  enProceso: number;
  contratados: number;
  tasaContratacion: number;
}

export interface FilaAnuncio {
  anuncioId: number;
  cargo: string;
  empresaId: number;
  empresaRazonSocial: string;
  estado: string;
  vacantes: number;
  postulaciones: number;
  enProceso: number;
  contratados: number;
  contratadosTotal: number;
  cobertura: number; // %
}

export interface ActividadReciente {
  fecha: string; // ISO con hora
  postulanteId: string;
  cargo: string;
  empresa: string;
  estado: EstadoProceso;
  usuario: string;
}

export interface DashboardDatos {
  rango: { desde: string; hasta: string; granularidad: Granularidad };
  resumen: ResumenDashboard;
  embudo: { estado: EstadoProceso; cantidad: number }[];
  serie: PuntoSerie[];
  porEmpresa: FilaEmpresa[];
  porAnuncio: FilaAnuncio[];
  competencias: { clave: string; etiqueta: string; promedio: number | null }[];
  actividad: ActividadReciente[];
}

export interface FiltrosDashboard {
  desde: string; // AAAA-MM-DD
  hasta: string; // AAAA-MM-DD
  empresaId: number | null; // null = todas las que el usuario puede ver
}
