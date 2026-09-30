import Link from "next/link";
import { notFound } from "next/navigation";
import EditarEmpresaForm from "@/features/empresas/components/EditarEmpresaForm";
import { mapearEmpresaDeApi } from "@/features/empresas/services/empresasApi";
import { obtenerDelGateway } from "@/lib/datosServidor";

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = Number(id);

  // Solo llegan las empresas que este usuario puede ver: si no está asignada, da 404.
  const empresasApi = (await obtenerDelGateway<Record<string, unknown>[]>("/empresas")) ?? [];
  const empresaExistente = empresasApi.map(mapearEmpresaDeApi).find((e) => e.id === empresaId);

  if (!empresaExistente) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/empresas/${empresaId}`}
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Volver al Detalle
        </Link>

        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Editar Empresa
        </h1>

        <EditarEmpresaForm empresa={empresaExistente} />
      </div>
    </div>
  );
}
