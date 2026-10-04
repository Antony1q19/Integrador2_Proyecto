"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useAnuncio } from "@/features/anuncios/hooks/useAnuncio";
import AnuncioFicha from "@/features/anuncios/components/AnuncioFicha";

export default function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const anuncioId = Number(id);
  const { anuncio, cargando, error, noEncontrado, cambiarEstado } = useAnuncio(anuncioId);

  if (noEncontrado) {
    notFound();
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-400">Cargando anuncio...</p>
        </div>
      </div>
    );
  }

  if (error || !anuncio) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">
            {error ?? "No se pudo cargar el anuncio"}
          </p>
        </div>
      </div>
    );
  }

  return <AnuncioFicha anuncio={anuncio} onCambiarEstado={cambiarEstado} />;
}