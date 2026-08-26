"use client";

import Link from "next/link";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import { useAnunciosFilters } from "@/features/anuncios/hooks/useAnunciosFilters";
import AnunciosFiltros from "@/features/anuncios/components/AnunciosFiltros";
import AnunciosView from "@/features/anuncios/components/AnunciosView";

export default function AnunciosPage() {
  const {
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cargosDisponibles,
    anunciosFiltrados,
  } = useAnunciosFilters(anunciosMock);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Anuncios
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {anunciosFiltrados.length} de {anunciosMock.length} anuncios
            </p>
          </div>
          <Link
            href="/anuncios/nuevo"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            + Nuevo Anuncio
          </Link>
        </div>

        <AnunciosFiltros
          filtros={filtros}
          actualizarFiltro={actualizarFiltro}
          limpiarFiltros={limpiarFiltros}
          cargosDisponibles={cargosDisponibles}
        />

        <AnunciosView anuncios={anunciosFiltrados} />
      </div>
    </div>
  );
}