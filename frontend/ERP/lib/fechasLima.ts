// lib/fechasLima.ts
//
// Fechas y horas SIEMPRE en hora de Perú (America/Lima), sin importar la zona del navegador o del servidor:
// una entrevista "a las 9:00" debe verse a las 9:00 para todos. El backend guarda el instante exacto y el
// navegador lo muestra en hora de Lima.
const ZONA = "America/Lima";

// Partes de una fecha vista en hora de Lima: { year, month, day, hour, minute } como texto con ceros.
function partesEnLima(fecha: Date): Record<string, string> {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  return Object.fromEntries(partes.map((p) => [p.type, p.value]));
}

// "2026-10-05" (día de hoy en Lima).
export function hoyEnLima(): string {
  const p = partesEnLima(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

// De un instante ISO ("2026-10-05T14:00:00Z") al texto que espera <input type="datetime-local">, en hora de Lima.
export function aInputDeFechaHora(iso: string): string {
  const p = partesEnLima(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "lun 5 oct 2026, 9:00 a. m."
export function formatoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// "9:00 a. m."
export function formatoHora(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

// "lun 5 oct" (para agrupar por día)
export function formatoDia(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

// De un texto "AAAA-MM-DD" (sin hora) a "05/10/2026", sin que la zona horaria lo corra de día.
export function formatoFecha(texto: string): string {
  const [anio, mes, dia] = texto.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// Suma días a un "AAAA-MM-DD".
export function sumarDiasATexto(texto: string, dias: number): string {
  const [a, m, d] = texto.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}
