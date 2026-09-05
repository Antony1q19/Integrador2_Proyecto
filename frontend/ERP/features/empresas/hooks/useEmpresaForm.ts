import { useState } from "react";
import { EmpresaFormData } from "@/features/empresas/types/formData";
import { EmpresaFormErrors } from "@/features/empresas/types/formErrors";
import {
  validarRUC,
  validarEmail,
  validarTelefono,
} from "@/features/empresas/utils/validators";

const datosVacios: EmpresaFormData = {
  razonSocial: "",
  ruc: "",
  contactoNombre: "",
  contactoEmail: "",
  contactoTelefono: "",
  sector: "",
};

interface UseEmpresaFormParams {
  initialData?: EmpresaFormData;
  onSubmitValido: (data: EmpresaFormData) => Promise<void> | void;
}

export function useEmpresaForm({
  initialData,
  onSubmitValido,
}: UseEmpresaFormParams) {
  const [formData, setFormData] = useState<EmpresaFormData>(
    initialData ?? datosVacios
  );
  const [errors, setErrors] = useState<EmpresaFormErrors>({});
  const [enviando, setEnviando] = useState(false);

  const validarFormulario = (): EmpresaFormErrors => {
    const nuevosErrores: EmpresaFormErrors = {};

    if (formData.razonSocial.trim().length < 3) {
      nuevosErrores.razonSocial =
        "La razón social debe tener al menos 3 caracteres";
    }
    if (!validarRUC(formData.ruc)) {
      nuevosErrores.ruc = "El RUC debe tener exactamente 11 dígitos numéricos";
    }
    if (!validarEmail(formData.contactoEmail)) {
      nuevosErrores.contactoEmail =
        "Ingresa un email válido (ej: nombre@empresa.com)";
    }
    if (!validarTelefono(formData.contactoTelefono)) {
      nuevosErrores.contactoTelefono =
        "El teléfono debe tener al menos 9 dígitos";
    }

    return nuevosErrores;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof EmpresaFormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const erroresEncontrados = validarFormulario();
    setErrors(erroresEncontrados);

    if (Object.keys(erroresEncontrados).length > 0) {
      return;
    }

    setEnviando(true);
    await onSubmitValido(formData);
    setEnviando(false);
  };

  return {
    formData,
    errors,
    enviando,
    handleChange,
    handleSubmit,
  };
}