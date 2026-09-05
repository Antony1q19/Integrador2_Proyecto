import { z } from "zod";

export const anuncioFormSchema = z
  .object({
    empresaId: z
      .number({ message: "Debes seleccionar una empresa" })
      .min(1, "Debes seleccionar una empresa"),
    cargo: z
      .string()
      .min(3, "El cargo debe tener al menos 3 caracteres")
      .max(100, "El cargo no puede exceder 100 caracteres"),
    descripcion: z
      .string()
      .min(20, "La descripción debe tener al menos 20 caracteres"),
    requisitos: z
      .string()
      .min(10, "Los requisitos deben tener al menos 10 caracteres"),
    numeroVacantes: z
      .number({ message: "Ingresa un número válido" })
      .int("Debe ser un número entero")
      .min(1, "Debe haber al menos 1 vacante"),
    salarioMin: z
      .number({ message: "Ingresa un número válido" })
      .min(0, "El salario mínimo no puede ser negativo"),
    salarioMax: z
      .number({ message: "Ingresa un número válido" })
      .min(0, "El salario máximo no puede ser negativo"),
    fechaLimite: z
      .string()
      .min(1, "La fecha límite es obligatoria"),
  })
  .refine((data) => data.salarioMax >= data.salarioMin, {
    message: "El salario máximo debe ser mayor o igual al mínimo",
    path: ["salarioMax"],
  })
  .refine((data) => new Date(data.fechaLimite) > new Date(), {
    message: "La fecha límite debe ser una fecha futura",
    path: ["fechaLimite"],
  });

export type AnuncioFormData = z.infer<typeof anuncioFormSchema>;