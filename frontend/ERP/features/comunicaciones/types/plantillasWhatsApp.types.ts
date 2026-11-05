// features/comunicaciones/types/plantillasWhatsApp.types.ts
//
// Plantillas de WhatsApp aprobadas por Meta. Son distintas de las plantillas rápidas del chat (textos
// propios para escribir más rápido): estas son las ÚNICAS que se le pueden enviar a un postulante que
// no ha escrito en las últimas 24 horas.

export type EstadoPlantilla = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | string;
export type CategoriaPlantilla = "MARKETING" | "UTILITY";

export interface PlantillaWhatsApp {
  nombre: string;
  categoria: string;
  idioma: string;
  estado: EstadoPlantilla;
  cuerpo: string;        // con {{1}}, {{2}}... donde van las variables
  variables: number;
  motivo_rechazo: string | null;
}

export interface NuevaPlantilla {
  nombre: string;
  categoria: CategoriaPlantilla;
  idioma: string;
  cuerpo: string;
  ejemplos: string[];
}

export const ESTADOS_PLANTILLA: Record<string, { texto: string; clase: string }> = {
  APPROVED: { texto: "Aprobada", clase: "bg-green-100 text-green-700" },
  PENDING: { texto: "En revisión", clase: "bg-amber-100 text-amber-700" },
  REJECTED: { texto: "Rechazada", clase: "bg-red-100 text-red-700" },
  PAUSED: { texto: "Pausada", clase: "bg-slate-100 text-slate-600" },
  DISABLED: { texto: "Deshabilitada", clase: "bg-slate-100 text-slate-600" },
};

export const IDIOMAS_PLANTILLA = [
  { codigo: "es", nombre: "Español" },
  { codigo: "es_MX", nombre: "Español (México)" },
  { codigo: "en_US", nombre: "Inglés (EE. UU.)" },
];

// Cuántas variables distintas ({{1}}, {{2}}...) tiene un texto.
export function contarVariables(cuerpo: string): number {
  return new Set(Array.from(cuerpo.matchAll(/\{\{(\d+)\}\}/g), (m) => m[1])).size;
}

// El texto con las variables reemplazadas (para la vista previa).
export function rellenarPlantilla(cuerpo: string, valores: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (marca, n) => valores[Number(n) - 1] || marca);
}
