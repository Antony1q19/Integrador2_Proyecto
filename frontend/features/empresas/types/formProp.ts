 import { EmpresaFormData } from "@/features/empresas/types/formData";
 
 export interface EmpresaFormProps {
  initialData?: EmpresaFormData;
  onSubmitValido: (data: EmpresaFormData) => Promise<void> | void;
  submitLabel: string;
  cancelHref: string;
}