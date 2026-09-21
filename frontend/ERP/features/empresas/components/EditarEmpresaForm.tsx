"use client";

import { useRouter } from "next/navigation";
import EmpresaForm from "@/features/empresas/components/EmpresaForm";
import { EmpresaFormData } from "@/features/empresas/types/formData";
import { Empresa } from "@/features/empresas/types/empresa";
import { actualizarEmpresa } from "@/features/empresas/services/empresasService";

// Parte interactiva de "Editar empresa" (la página en sí se dibuja en el servidor para poder
// comprobar que la empresa es una de las que el usuario puede ver).
export default function EditarEmpresaForm({ empresa }: { empresa: Empresa }) {
  const router = useRouter();

  const handleActualizar = async (data: EmpresaFormData) => {
    await actualizarEmpresa(empresa.id, data);
    router.push(`/empresas/${empresa.id}`);
  };

  return (
    <EmpresaForm
      initialData={{
        razonSocial: empresa.razonSocial,
        ruc: empresa.ruc,
        contactoNombre: empresa.contactoNombre,
        contactoEmail: empresa.contactoEmail,
        contactoTelefono: empresa.contactoTelefono,
        sector: empresa.sector,
      }}
      onSubmitValido={handleActualizar}
      submitLabel="Guardar Cambios"
      cancelHref={`/empresas/${empresa.id}`}
    />
  );
}
