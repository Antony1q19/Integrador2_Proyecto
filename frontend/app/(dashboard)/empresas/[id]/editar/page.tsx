"use client";

import { use } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import EmpresaForm from "@/features/empresas/components/EmpresaForm";
import { EmpresaFormData } from "@/features/empresas/types/formData";
import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { actualizarEmpresa } from "@/features/empresas/services/empresasService";

export default function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const empresaId = Number(id);
  const empresaExistente = empresasMock.find((e) => e.id === empresaId);

  if (!empresaExistente) {
    notFound();
  }

  const handleActualizar = async (data: EmpresaFormData) => {
    await actualizarEmpresa(empresaId, data);
    router.push(`/empresas/${empresaId}`);
  };

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

        <EmpresaForm
          initialData={{
            razonSocial: empresaExistente.razonSocial,
            ruc: empresaExistente.ruc,
            contactoNombre: empresaExistente.contactoNombre,
            contactoEmail: empresaExistente.contactoEmail,
            contactoTelefono: empresaExistente.contactoTelefono,
            sector: empresaExistente.sector,
          }}
          onSubmitValido={handleActualizar}
          submitLabel="Guardar Cambios"
          cancelHref={`/empresas/${empresaId}`}
        />
      </div>
    </div>
  );
}