"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AnuncioForm from "@/features/anuncios/components/AnuncioForm"; 
import { AnuncioFormData } from "@/features/anuncios/types/schema";
import { crearAnuncio } from "@/features/anuncios/services/anunciosService";

export default function NuevoAnuncioPage() {
  const router = useRouter();

  const handleCrear = async (data: AnuncioFormData) => {
    await crearAnuncio(data);
    router.push("/anuncios");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/anuncios"
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Volver a Anuncios
        </Link>

        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Publicar Nuevo Anuncio
        </h1>

        <AnuncioForm
          onSubmitValido={handleCrear}
          submitLabel="Publicar Anuncio"
          cancelHref="/anuncios"
        />
      </div>
    </div>
  );
}