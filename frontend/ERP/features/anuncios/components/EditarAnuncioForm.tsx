"use client";

import { useRouter } from "next/navigation";
import AnuncioForm from "@/features/anuncios/components/AnuncioForm";
import { AnuncioFormData } from "@/features/anuncios/types/schema";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { actualizarAnuncio } from "@/features/anuncios/services/anunciosService";

// Parte interactiva de "Editar anuncio" (la página en sí se dibuja en el servidor para poder
// comprobar que el anuncio es uno de los que el usuario puede ver).
export default function EditarAnuncioForm({ anuncio }: { anuncio: Anuncio }) {
  const router = useRouter();

  const handleActualizar = async (data: AnuncioFormData) => {
    await actualizarAnuncio(anuncio.id, data);
    router.push(`/anuncios/${anuncio.id}`);
  };

  return (
    <AnuncioForm
      initialData={{
        empresaId: anuncio.empresaId,
        cargo: anuncio.cargo,
        descripcion: anuncio.descripcion ?? "",
        requisitos: anuncio.requisitos ?? "",
        numeroVacantes: anuncio.numeroVacantes,
        salarioMin: anuncio.salarioMin ?? 0,
        salarioMax: anuncio.salarioMax ?? 0,
        fechaLimite: anuncio.fechaLimite,
      }}
      onSubmitValido={handleActualizar}
      submitLabel="Guardar Cambios"
      cancelHref={`/anuncios/${anuncio.id}`}
    />
  );
}