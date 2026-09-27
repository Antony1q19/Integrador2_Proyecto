import { EmpresaFormData } from "@/features/empresas/types/formData";
import { Empresa } from "@/features/empresas/types/empresa";
import { mapearEmpresaDeApi } from "@/features/empresas/services/empresasApi";
import { marcarVencido } from "@/lib/cacheCliente";

async function parsearYMapear(respuesta: Response): Promise<Empresa> {
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "Ocurrió un error inesperado");
  }
  return mapearEmpresaDeApi(cuerpo as Record<string, unknown>);
}

export async function listarEmpresas(): Promise<Empresa[]> {
  const respuesta = await fetch("/api/empresas");
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "Ocurrió un error inesperado");
  }
  return (cuerpo as Record<string, unknown>[]).map(mapearEmpresaDeApi);
}

export async function obtenerEmpresa(id: number): Promise<Empresa> {
  const respuesta = await fetch(`/api/empresas/${id}`);
  return parsearYMapear(respuesta);
}

export async function crearEmpresa(data: EmpresaFormData): Promise<Empresa> {
  const respuesta = await fetch("/api/empresas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const empresa = await parsearYMapear(respuesta);
  marcarVencido("empresas:");
  return empresa;
}

export async function actualizarEmpresa(
  id: number,
  data: EmpresaFormData
): Promise<Empresa> {
  const respuesta = await fetch(`/api/empresas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const empresa = await parsearYMapear(respuesta);
  marcarVencido("empresas:");
  return empresa;
}

export async function eliminarEmpresa(id: number): Promise<void> {
  const respuesta = await fetch(`/api/empresas/${id}`, { method: "DELETE" });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "No se pudo eliminar la empresa");
  }
  marcarVencido("empresas:");
}