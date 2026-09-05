import { EmpresaFormData } from "@/features/empresas/types/formData";

// Simula POST /api/empresas
// Cuando exista el backend real, el contenido de esta función cambia,
// pero su "forma" (recibe FormData, devuelve una Promise) se mantiene igual.
export function crearEmpresa(data: EmpresaFormData): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Empresa a registrar:", data);
      resolve();
    }, 800);
  });
}

// Simula PUT /api/empresas/:id
export function actualizarEmpresa(
  id: number,
  data: EmpresaFormData
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Empresa actualizada:", { id, ...data });
      resolve();
    }, 800);
  });
}