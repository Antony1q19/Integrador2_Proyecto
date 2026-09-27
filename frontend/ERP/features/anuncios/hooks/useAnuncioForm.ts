import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  anuncioFormSchema,
  AnuncioFormData,
} from "@/features/anuncios/types/schema";

interface UseAnuncioFormParams {
  initialData?: Partial<AnuncioFormData>;
  onSubmitValido: (data: AnuncioFormData) => Promise<void> | void;
}

export function useAnuncioForm({
  initialData,
  onSubmitValido,
}: UseAnuncioFormParams) {
  const form = useForm<AnuncioFormData>({
    resolver: zodResolver(anuncioFormSchema),
    defaultValues: {
      cargo: "",
      descripcion: "",
      requisitos: "",
      numeroVacantes: 1,
      salarioMin: 0,
      salarioMax: 0,
      fechaLimite: "",
      empresaId: undefined,
      ...initialData,
    },
  });

  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const handleSubmit = form.handleSubmit(async (data) => {
    setErrorEnvio(null);
    try {
      await onSubmitValido(data);
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : "Ocurrió un error al guardar");
    }
  });

  return {
    ...form,
    handleSubmit,
    errorEnvio,
  };
}