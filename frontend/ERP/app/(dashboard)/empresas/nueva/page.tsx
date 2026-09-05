"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import EmpresaForm from "@/features/empresas/components/EmpresaForm";
import { EmpresaFormData } from "@/features/empresas/types/formData";
import { crearEmpresa } from "@/features/empresas/services/empresasService";

export default function NuevaEmpresaPage() {
  const router = useRouter();

  const handleCrear = async (data: EmpresaFormData) => {
    await crearEmpresa(data);
    router.push("/empresas");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/empresas"
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Volver a Empresas
        </Link>

        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Registrar Nueva Empresa
        </h1>

        <EmpresaForm
          onSubmitValido={handleCrear}
          submitLabel="Registrar Empresa"
          cancelHref="/empresas"
        />
      </div>
    </div>
  );
}