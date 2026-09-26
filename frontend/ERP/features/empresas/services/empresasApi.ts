// features/empresas/services/empresasApi.ts
//
// Lectura de empresas desde la base de datos (servicio-empresas-vacantes, a través del Gateway).
// El backend solo devuelve las empresas que el usuario tiene asignadas (Admin: todas).
import { Empresa } from "../types/empresa";
import { empresasMock } from "../data/mock_empresas";
import { mensajeDeError, sesionVencida } from "@/lib/apiCliente";
import { cargarConCache } from "@/lib/cacheCliente";

// Interruptor mock/API (ver postulantesService.ts): con API se usan las rutas /api/... del ERP.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Convierte una empresa del backend al formato que dibujan las pantallas (los datos de
// contacto pueden venir vacíos en la base de datos).
export function mapearEmpresaDeApi(dto: Record<string, unknown>): Empresa {
  return {
    id: dto.id as number,
    razonSocial: dto.razonSocial as string,
    ruc: dto.ruc as string,
    contactoNombre: (dto.contactoNombre as string | null) ?? "",
    contactoEmail: (dto.contactoEmail as string | null) ?? "",
    contactoTelefono: (dto.contactoTelefono as string | null) ?? "",
    sector: (dto.sector as string | null) ?? "",
    fechaRegistro: dto.fechaRegistro as string,
    anunciosActivos: (dto.anunciosActivos as number) ?? 0,
  };
}

// Lista de empresas (desde el navegador). Se recuerda 60 s: se pide en muchas pantallas y casi no cambia.
export function fetchEmpresas(): Promise<Empresa[]> {
  return cargarConCache("empresas:lista", pedirEmpresas, 60_000);
}

async function pedirEmpresas(): Promise<Empresa[]> {
  if (API_URL) {
    const res = await fetch("/api/empresas");
    if (res.status === 401) throw new Error(sesionVencida());
    if (!res.ok) throw new Error(await mensajeDeError(res, "Error al obtener las empresas"));
    const dtos: Record<string, unknown>[] = await res.json();
    return dtos.map(mapearEmpresaDeApi);
  }
  return structuredClone(empresasMock); // modo mock (sin backend)
}
