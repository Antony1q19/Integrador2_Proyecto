// features/anuncios/services/anunciosApi.ts
//
// Lectura de anuncios desde la base de datos (servicio-empresas-vacantes, a través del Gateway).
// El backend solo devuelve los anuncios de las empresas que el usuario tiene asignadas (Admin: todos).
import { Anuncio } from "../types/anuncio";
import { anunciosMock } from "../data/mock-anuncios";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";

// Interruptor mock/API (ver postulantesService.ts): con API se usan las rutas /api/... del ERP.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Un anuncio de servicio-empresas-vacantes. `postulantesAsociadosIds` va vacío porque
// esa relación ahora vive en las postulaciones (servicio-procesos-seleccion).
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
    postulantesAsociadosIds: [],
  };
}

// Lista de anuncios (desde el navegador).
export async function fetchAnuncios(): Promise<Anuncio[]> {
  if (API_URL) {
    // ---- MODO API (navegador -> /api/anuncios (Next.js) -> Gateway -> servicio-empresas-vacantes) ----
    const res = await fetch("/api/anuncios");
    if (res.status === 401) throw new Error(sesionVencida());
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al obtener los anuncios"));
    const dtos: Record<string, unknown>[] = await res.json();
    return dtos.map(mapearAnuncioDeApi);
  }

  // ---- MODO MOCK ----
  return structuredClone(anunciosMock);
}
