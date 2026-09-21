"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { Empresa } from "@/features/empresas/types/empresa";
import { fetchAnuncios } from "@/features/anuncios/services/anunciosApi";
import { fetchEmpresas } from "@/features/empresas/services/empresasApi";
import { useAnunciosFilters } from "@/features/anuncios/hooks/useAnunciosFilters";
import AnunciosFiltros from "@/features/anuncios/components/AnunciosFiltros";
import AnunciosView from "@/features/anuncios/components/AnunciosView";

export default function AnunciosPage() {
  // Los anuncios y las empresas salen de la base de datos; el backend solo entrega los de las
  // empresas que este usuario tiene asignadas (un Admin ve todos).
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([fetchAnuncios(), fetchEmpresas()])
      .then(([listaAnuncios, listaEmpresas]) => {
        if (cancelado) return;
        setAnuncios(listaAnuncios);
        setEmpresas(listaEmpresas);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudieron cargar los anuncios");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const {
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cargosDisponibles,
    anunciosFiltrados,
  } = useAnunciosFilters(anuncios);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Anuncios
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {anunciosFiltrados.length} de {anuncios.length} anuncios
            </p>
          </div>
          <Link
            href="/anuncios/nuevo"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            + Nuevo Anuncio
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {cargando ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando anuncios…</p>
        ) : (
          <>
            <AnunciosFiltros
              filtros={filtros}
              actualizarFiltro={actualizarFiltro}
              limpiarFiltros={limpiarFiltros}
              cargosDisponibles={cargosDisponibles}
              empresas={empresas}
            />

            <AnunciosView anuncios={anunciosFiltrados} />
          </>
        )}
      </div>
    </div>
  );
}
