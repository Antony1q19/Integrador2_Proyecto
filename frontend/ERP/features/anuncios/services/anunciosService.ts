import { AnuncioFormData } from "@/features/anuncios/types/schema";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { mapearAnuncioDeApi } from "@/features/anuncios/services/anunciosApi";
import { marcarVencido } from "@/lib/cacheCliente";

async function parsearYMapear(respuesta: Response): Promise<Anuncio> {
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "Ocurrió un error inesperado");
  }
  return mapearAnuncioDeApi(cuerpo as Record<string, unknown>);
}

export async function listarAnuncios(): Promise<Anuncio[]> {
  const respuesta = await fetch("/api/anuncios");
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "Ocurrió un error inesperado");
  }
  return (cuerpo as Record<string, unknown>[]).map(mapearAnuncioDeApi);
}

export async function obtenerAnuncio(id: number): Promise<Anuncio> {
  const respuesta = await fetch(`/api/anuncios/${id}`);
  return parsearYMapear(respuesta);
}

export async function crearAnuncio(data: AnuncioFormData): Promise<Anuncio> {
  const respuesta = await fetch("/api/anuncios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const anuncio = await parsearYMapear(respuesta);
  marcarVencido("anuncios:");
  return anuncio;
}

export async function actualizarAnuncio(
  id: number,
  data: AnuncioFormData
): Promise<Anuncio> {
  const respuesta = await fetch(`/api/anuncios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const anuncio = await parsearYMapear(respuesta);
  marcarVencido("anuncios:");
  return anuncio;
}

export async function cambiarEstadoAnuncio(
  id: number,
  estado: EstadoAnuncio
): Promise<Anuncio> {
  const respuesta = await fetch(`/api/anuncios/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  const anuncio = await parsearYMapear(respuesta);
  marcarVencido("anuncios:");
  return anuncio;
}

export async function eliminarAnuncio(id: number): Promise<void> {
  const respuesta = await fetch(`/api/anuncios/${id}`, { method: "DELETE" });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "No se pudo eliminar el anuncio");
  }
  marcarVencido("anuncios:");
}