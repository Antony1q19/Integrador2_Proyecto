// features/comunicaciones/services/plantillasService.ts
//
// Plantillas de WhatsApp: navegador -> /api/comunicaciones/plantillas (Next.js) -> Gateway
// -> servicio-comunicaciones -> Meta.
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { Mensaje, PlantillaMensaje } from "../types/comunicaciones.types";
import { NuevaPlantilla, PlantillaWhatsApp } from "../types/plantillasWhatsApp.types";

async function responder<T>(res: Response, mensajePorDefecto: string): Promise<T> {
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, mensajePorDefecto));
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function fetchPlantillasWhatsApp(): Promise<PlantillaWhatsApp[]> {
  return responder(await fetch("/api/comunicaciones/plantillas"), "No se pudieron cargar las plantillas");
}

export async function crearPlantillaWhatsApp(datos: NuevaPlantilla): Promise<PlantillaWhatsApp> {
  const res = await fetch("/api/comunicaciones/plantillas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return responder(res, "No se pudo crear la plantilla");
}

export async function eliminarPlantillaWhatsApp(nombre: string): Promise<void> {
  const res = await fetch(`/api/comunicaciones/plantillas/${encodeURIComponent(nombre)}`, { method: "DELETE" });
  return responder(res, "No se pudo eliminar la plantilla");
}

export async function enviarPlantillaWhatsApp(
  conversacionId: string,
  plantilla: Pick<PlantillaWhatsApp, "nombre" | "idioma">,
  variables: string[],
): Promise<Mensaje> {
  const res = await fetch(`/api/comunicaciones/${encodeURIComponent(conversacionId)}/plantilla`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: plantilla.nombre, idioma: plantilla.idioma, variables }),
  });
  const dto = await responder<{
    id: string;
    conversacion_id: string;
    remitente: Mensaje["remitente"];
    texto: string;
    fecha: string;
    estado: Mensaje["estado"];
    error: string | null;
  }>(res, "No se pudo enviar la plantilla");
  return {
    id: dto.id,
    contactoId: dto.conversacion_id,
    remitente: dto.remitente,
    texto: dto.texto,
    fecha: dto.fecha,
    estado: dto.estado,
    error: dto.error,
  };
}

// ============================================================
// PLANTILLAS RÁPIDAS DEL CHAT (textos editables, guardados en nuestra base)
// ============================================================
interface PlantillaRapidaBackend {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  contenido: string;
}

const aPlantillaMensaje = (p: PlantillaRapidaBackend): PlantillaMensaje => ({
  id: p.id,
  nombre: p.titulo,
  descripcion: p.descripcion,
  categoria: p.categoria,
  contenido: p.contenido,
});

export async function fetchPlantillasRapidas(): Promise<PlantillaMensaje[]> {
  const lista = await responder<PlantillaRapidaBackend[]>(
    await fetch("/api/comunicaciones/plantillas-rapidas"),
    "No se pudieron cargar las plantillas"
  );
  return lista.map(aPlantillaMensaje);
}

export async function actualizarPlantillaRapida(
  id: string,
  datos: { titulo: string; descripcion: string; contenido: string },
): Promise<PlantillaMensaje> {
  const res = await fetch(`/api/comunicaciones/plantillas-rapidas/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return aPlantillaMensaje(await responder<PlantillaRapidaBackend>(res, "No se pudo guardar la plantilla"));
}
