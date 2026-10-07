/*"use client";

import Link from "next/link";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { Empresa } from "@/features/empresas/types/empresa";
import { fetchAnuncios } from "@/features/anuncios/services/anunciosApi";
import { fetchEmpresas } from "@/features/empresas/services/empresasApi";
import { useCargaConCache } from "@/lib/cacheCliente";
import { Skeleton, SkeletonTabla } from "@/components/shared/Skeleton";
import { useAnunciosFilters } from "@/features/anuncios/hooks/useAnunciosFilters";
import AnunciosFiltros from "@/features/anuncios/components/AnunciosFiltros";
import AnunciosView from "@/features/anuncios/components/AnunciosView";

export default function AnunciosPage() {
  // Los anuncios y las empresas salen de la base de datos; el backend solo entrega los de las
  // empresas que este usuario tiene asignadas (un Admin ve todos).
  const anunciosCarga = useCargaConCache<Anuncio[]>("anuncios:lista", fetchAnuncios, 30_000);
  const empresasCarga = useCargaConCache<Empresa[]>("empresas:lista", fetchEmpresas, 30_000);
  const anuncios = anunciosCarga.datos ?? [];
  const empresas = empresasCarga.datos ?? [];
  const cargando = anunciosCarga.cargando || empresasCarga.cargando;
  const error = anunciosCarga.error ?? empresasCarga.error;

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
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            + Nuevo Anuncio
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {cargando ? (
          <div aria-hidden className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Skeleton className="mb-3 h-10 w-full" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-44" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
            <SkeletonTabla columnas={5} filas={5} anchos={["w-48", "w-40", "w-20", "w-20", "w-24"]} />
          </div>
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
*/

"use client";

import Link from "next/link";
import { usePermisos } from "@/lib/usePermisos";
import { useAnuncios } from "@/features/anuncios/hooks/useAnuncios";
import { useAnunciosFilters } from "@/features/anuncios/hooks/useAnunciosFilters";
import { useEmpresas } from "@/features/empresas/hooks/useEmpresas";
import AnunciosFiltros from "@/features/anuncios/components/AnunciosFiltros";
import AnunciosView from "@/features/anuncios/components/AnunciosView";

export default function AnunciosPage() {
  const { anuncios, cargando, error, eliminar, cambiarEstado } = useAnuncios();
  const { empresas } = useEmpresas();
  // RRHH solo ve los anuncios; crearlos, cerrarlos o eliminarlos es de Admin y Supervisor.
  const { puedeGestionarAnuncios } = usePermisos();
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
            <h1 className="text-2xl font-semibold text-slate-900">Anuncios</h1>
            <p className="mt-1 text-sm text-slate-500">
              {cargando
                ? "Cargando..."
                : `${anunciosFiltrados.length} de ${anuncios.length} anuncios`}
            </p>
          </div>
          {puedeGestionarAnuncios && (
            <Link
              href="/anuncios/nuevo"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              + Nuevo Anuncio
            </Link>
          )}
        </div>

        {cargando && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-400">Cargando anuncios...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <>
            <AnunciosFiltros
              filtros={filtros}
              actualizarFiltro={actualizarFiltro}
              limpiarFiltros={limpiarFiltros}
              cargosDisponibles={cargosDisponibles}
              empresas={empresas}
            />
            <AnunciosView
              anuncios={anunciosFiltrados}
              onEliminar={eliminar}
              onCambiarEstado={cambiarEstado}
              puedeGestionar={puedeGestionarAnuncios}
            />
          </>
        )}
      </div>
    </div>
  );
}