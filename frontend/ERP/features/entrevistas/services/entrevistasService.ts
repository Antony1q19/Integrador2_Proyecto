// features/entrevistas/services/entrevistasService.ts
//
// Entrevistas: navegador -> /api/entrevistas (Next.js) -> Gateway -> servicio-procesos-seleccion.
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { marcarVencido } from "@/lib/cacheCliente";
import { CambiosEntrevista, Entrevista, FiltrosEntrevistas, NuevaEntrevista } from "../types/entrevista.types";

// Nombre con el que se guarda esta consulta en la memoria del navegador (ver lib/cacheCliente.ts).
export function claveEntrevistas(filtros: FiltrosEntrevistas): string {
  return `entrevistas:${JSON.stringify(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== "").sort())}`;
}

async function responder<T>(res: Response, mensajePorDefecto: string): Promise<T> {
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, mensajePorDefecto));
  return res.json();
}

// Programar o cambiar una entrevista mueve la postulación de etapa y cambia lo que muestran otras pantallas.
function avisarCambio(postulanteId: string): void {
  marcarVencido("entrevistas:");
  marcarVencido("dashboard:");
  marcarVencido("postulantes:");
  marcarVencido(`postulante:${postulanteId}`);
}

export async function fetchEntrevistas(filtros: FiltrosEntrevistas = {}): Promise<Entrevista[]> {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const consulta = parametros.toString();
  return responder(await fetch(`/api/entrevistas${consulta ? `?${consulta}` : ""}`), "No se pudieron cargar las entrevistas");
}

export async function programarEntrevista(datos: NuevaEntrevista): Promise<Entrevista> {
  const res = await fetch("/api/entrevistas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const creada = await responder<Entrevista>(res, "No se pudo programar la entrevista");
  avisarCambio(datos.postulanteId);
  return creada;
}

export async function actualizarEntrevista(entrevista: Entrevista, cambios: CambiosEntrevista): Promise<Entrevista> {
  const res = await fetch(`/api/entrevistas/${encodeURIComponent(entrevista.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  const actualizada = await responder<Entrevista>(res, "No se pudo actualizar la entrevista");
  avisarCambio(entrevista.postulanteId);
  return actualizada;
}
