import { EmpresasView } from "@/features/empresas/components/EmpresasView";
import { mapearEmpresaDeApi } from "@/features/empresas/services/empresasApi";
import { obtenerDelGateway } from "@/lib/datosServidor";

export default async function EmpresasPage() {
  // Las empresas salen de la base de datos, ya filtradas por el backend: un Admin ve todas;
  // RRHH/Supervisor solo las que un Admin les asignó en /perfil -> "Gestión de Trabajadores".
  const dtos = (await obtenerDelGateway<Record<string, unknown>[]>("/empresas")) ?? [];
  return <EmpresasView empresas={dtos.map(mapearEmpresaDeApi)} />;
}
