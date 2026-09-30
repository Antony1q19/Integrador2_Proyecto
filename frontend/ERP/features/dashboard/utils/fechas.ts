// features/dashboard/utils/fechas.ts
//
// Ayudas de fechas del Dashboard. Las fechas viajan como texto "AAAA-MM-DD" (sin hora) para que no
// se corran de día por la zona horaria.
import { Granularidad } from "../types/dashboard";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-09-05" a partir de una fecha, en la hora LOCAL del navegador.
export function aTexto(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// La fecha de un "AAAA-MM-DD" como Date local (a mediodía, para que ningún cambio de horario la corra).
function desdeTexto(texto: string): Date {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12);
}

export function sumarDias(texto: string, dias: number): string {
  const fecha = desdeTexto(texto);
  fecha.setDate(fecha.getDate() + dias);
  return aTexto(fecha);
}

// "05/09/2026"
export function formatoCompleto(texto: string): string {
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Etiqueta corta de un punto de la gráfica según cómo se agrupa: "05/09", "sem 31/08" o "sep 2026".
export function etiquetaCorta(texto: string, granularidad: Granularidad): string {
  const [anio, mes, dia] = texto.split("-");
  if (granularidad === "mes") return `${MESES[Number(mes) - 1]} ${anio}`;
  if (granularidad === "semana") return `sem ${dia}/${mes}`;
  return `${dia}/${mes}`;
}

export interface AtajoRango {
  id: string;
  etiqueta: string;
  calcular: (hoy: string) => { desde: string; hasta: string };
}

// Botones de rangos rápidos.
export const ATAJOS_RANGO: AtajoRango[] = [
  { id: "7", etiqueta: "7 días", calcular: (hoy) => ({ desde: sumarDias(hoy, -6), hasta: hoy }) },
  { id: "30", etiqueta: "30 días", calcular: (hoy) => ({ desde: sumarDias(hoy, -29), hasta: hoy }) },
  { id: "90", etiqueta: "90 días", calcular: (hoy) => ({ desde: sumarDias(hoy, -89), hasta: hoy }) },
  { id: "mes", etiqueta: "Este mes", calcular: (hoy) => ({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy }) },
  { id: "anio", etiqueta: "Este año", calcular: (hoy) => ({ desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }) },
  // El backend acepta hasta 5 años de rango.
  { id: "todo", etiqueta: "Todo", calcular: (hoy) => ({ desde: sumarDias(hoy, -1825), hasta: hoy }) },
];
