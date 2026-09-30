// features/contrataciones/services/contratacionesService.ts
//
// Contrataciones y seguimientos: navegador -> /api/... (Next.js) -> Gateway -> servicio-procesos-seleccion.
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { marcarVencido } from "@/lib/cacheCliente";
import {
  CambiosContratacion,
  CambiosSeguimiento,
  Contratacion,
  FiltrosContrataciones,
  NuevaContratacion,
  Seguimiento,
} from "../types/contratacion.types";

export function claveContrataciones(filtros: FiltrosContrataciones): string {
  return `contrataciones:${JSON.stringify(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "").sort())}`;
}

async function responder<T>(res: Response, mensajePorDefecto: string): Promise<T> {
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, mensajePorDefecto));
  return res.json();
}

// Contratar cambia la etapa de la postulación y los indicadores del Dashboard: lo guardado en memoria se marca vencido.
function avisarCambio(postulanteId: string): void {
  marcarVencido("contrataciones:");
  marcarVencido("dashboard:");
  marcarVencido("postulantes:");
  marcarVencido(`postulante:${postulanteId}`);
}

const json = { "Content-Type": "application/json" };

export async function fetchContrataciones(filtros: FiltrosContrataciones = {}): Promise<Contratacion[]> {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const consulta = parametros.toString();
  return responder(await fetch(`/api/contrataciones${consulta ? `?${consulta}` : ""}`), "No se pudieron cargar las contrataciones");
}

// Registra la contratación Y marca la postulación como "Contratado" (lo hace el servidor, todo junto).
export async function registrarContratacion(datos: NuevaContratacion): Promise<Contratacion> {
  const res = await fetch("/api/contrataciones", { method: "POST", headers: json, body: JSON.stringify(datos) });
  const creada = await responder<Contratacion>(res, "No se pudo registrar la contratación");
  avisarCambio(datos.postulanteId);
  return creada;
}

export async function actualizarContratacion(contratacion: Contratacion, cambios: CambiosContratacion): Promise<Contratacion> {
  const res = await fetch(`/api/contrataciones/${encodeURIComponent(contratacion.id)}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(cambios),
  });
  const actualizada = await responder<Contratacion>(res, "No se pudo actualizar la contratación");
  avisarCambio(contratacion.postulanteId);
  return actualizada;
}

export async function actualizarSeguimiento(seguimiento: Seguimiento, cambios: CambiosSeguimiento): Promise<Seguimiento> {
  const res = await fetch(`/api/seguimientos/${encodeURIComponent(seguimiento.id)}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(cambios),
  });
  const actualizado = await responder<Seguimiento>(res, "No se pudo guardar el seguimiento");
  avisarCambio(seguimiento.postulanteId);
  return actualizado;
}

export async function agregarSeguimiento(contratacion: Contratacion, hitoDias: number, observaciones?: string): Promise<Seguimiento> {
  const res = await fetch("/api/seguimientos", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ contratacionId: contratacion.id, hitoDias, observaciones }),
  });
  const creado = await responder<Seguimiento>(res, "No se pudo agregar el seguimiento");
  avisarCambio(contratacion.postulanteId);
  return creado;
}
