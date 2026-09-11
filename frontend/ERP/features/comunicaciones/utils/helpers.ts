// features/comunicaciones/utils/helpers.ts
import { Contacto } from "../types/comunicaciones.types";

/**
 * Obtiene las iniciales de un contacto (máximo 2 caracteres)
 */
export function getIniciales(contacto: Contacto): string {
  return `${contacto.nombre.charAt(0)}${contacto.apellido.charAt(0)}`.toUpperCase();
}

/**
 * Obtiene el nombre completo del contacto
 */
export function getNombreCompleto(contacto: Contacto): string {
  return `${contacto.nombre} ${contacto.apellido}`;
}

/**
 * Formatea el teléfono para mostrarlo de forma consistente
 */
export function formatearTelefono(telefono: string): string {
  return telefono.replace(/\s+/g, " ").trim();
}

/**
 * Formatea una fecha relativa ("Hace 2 horas", "Ayer", etc.)
 */
export function formatearFechaRelativa(fecha: string): string {
  const ahora = new Date();
  const fechaDate = new Date(fecha);
  const diffMs = ahora.getTime() - fechaDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  if (diffDias === 1) return "Ayer";
  if (diffDias < 7) return `Hace ${diffDias} días`;

  return fechaDate.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Obtiene el color del indicador de estado
 */
export function getEstadoColor(estado: Contacto["estado"]): string {
  const colores: Record<Contacto["estado"], string> = {
    en_linea: "bg-green-500",
    ausente: "bg-yellow-500",
    desconectado: "bg-slate-400",
  };
  return colores[estado];
}