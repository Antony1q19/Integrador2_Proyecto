import { AnuncioFormData } from "@/features/anuncios/types/schema";

// Simula POST /api/anuncios
export function crearAnuncio(data: AnuncioFormData): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Anuncio a registrar:", {
        ...data,
        estado: "Abierto", // criterio de aceptación: estado inicial por defecto
      });
      resolve();
    }, 800);
  });
}