// features/anuncios/services/anunciosApi.ts
//
// Lectura de anuncios desde la base de datos (servicio-empresas-vacantes, a través del Gateway).
// El backend solo devuelve los anuncios de las empresas que el usuario tiene asignadas (Admin: todos).
import { Anuncio } from "../types/anuncio";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { cargarConCache } from "@/lib/cacheCliente";

// Un anuncio de servicio-empresas-vacantes (los postulantes de cada anuncio viven en las
// postulaciones de servicio-procesos-seleccion).
export function mapearAnuncioDeApi(dto: Record<string, unknown>): Anuncio {
  return {
    id: dto.id as number,
    cargo: dto.cargo as string,
    descripcion: (dto.descripcion as string) ?? "",
    requisitos: (dto.requisitos as string) ?? "",
    numeroVacantes: dto.numeroVacantes as number,
    salarioMin: (dto.salarioMin as number) ?? 0,
    salarioMax: (dto.salarioMax as number) ?? 0,
    fechaLimite: dto.fechaLimite as string,
    estado: dto.estado as Anuncio["estado"],
    empresaId: dto.empresaId as number,
    empresaRazonSocial: dto.empresaRazonSocial as string,
    fechaCreacion: dto.fechaCreacion as string,
  };
}

// Lista de anuncios (desde el navegador). Se recuerda 60 s: se pide en muchas pantallas y casi no cambia.
export function fetchAnuncios(): Promise<Anuncio[]> {
  return cargarConCache("anuncios:lista", pedirAnuncios, 60_000);
}

// navegador -> /api/anuncios (Next.js) -> Gateway -> servicio-empresas-vacantes
async function pedirAnuncios(): Promise<Anuncio[]> {
  const res = await fetch("/api/anuncios");
  if (res.status === 401) throw new Error(sesionVencida());
  if (!res.ok) throw new Error(await mensajeDeError(res, "Error al obtener los anuncios"));
  const dtos: Record<string, unknown>[] = await res.json();
  return dtos.map(mapearAnuncioDeApi);
}
