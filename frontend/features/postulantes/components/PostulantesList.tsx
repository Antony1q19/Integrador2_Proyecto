// features/postulantes/components/PostulantesList.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, memo } from "react";
import { Plus } from "lucide-react";

import { SortableField, usePostulantesList } from "../hooks/usePostulantesList";

import { PostulantesSearch } from "./PostulantesSearch";
import { PostulantesFilters } from "./PostulantesFilters";
import { PostulantesTable } from "./PostulantesTable";

export const PostulantesList = memo(function PostulantesList() {
  const router = useRouter();

  const {
    postulantes,
    loading,
    error,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cambiarOrden,
    page,
    pageSize,
    totalPages,
    totalItems,
    cambiarPagina,
    cambiarPageSize,
    estadosOptions,
    cargosOptions,
    empresasOptions,
  } = usePostulantesList();

  // ============================================================
  // ORDENAMIENTO - Estable con useCallback
  // ============================================================
  const handleSort = useCallback((field: SortableField) => {
    cambiarOrden(field);
  }, [cambiarOrden]);

  // ============================================================
  // BÚSQUEDA - Estable con useCallback
  // ============================================================
  const handleSearch = useCallback((term: string) => {
    actualizarFiltro("search", term);
  }, [actualizarFiltro]);

  // ============================================================
  // FILTROS - Estable con useCallback
  // ============================================================
  const handleFilterChange = useCallback(
    (key: "estado" | "cargo" | "empresa" | "fechaInicio" | "fechaFin", value: string) => {
      actualizarFiltro(key, value);
    },
    [actualizarFiltro]
  );

  // ============================================================
  // ERROR
  // ============================================================
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192-3 1.732-3z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
          Error al cargar los datos
        </h3>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Postulantes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona todos los candidatos registrados en el sistema
          </p>
        </div>
        <button
          onClick={() => router.push("/postulantes/nuevo")}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Postulante
        </button>
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col gap-4">
        <PostulantesSearch
          onSearch={handleSearch}
          initialValue={filtros.search}
          placeholder="Buscar por nombre, apellido o documento..."
        />
        <PostulantesFilters
          filtros={{
            estado: filtros.estado,
            cargo: filtros.cargo,
            empresa: filtros.empresa,
            fechaInicio: filtros.fechaInicio,
            fechaFin: filtros.fechaFin,
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={limpiarFiltros}
          estadosOptions={estadosOptions}
          cargosOptions={cargosOptions}
          empresasOptions={empresasOptions}
        />
      </div>

      {/* TABLA */}
      <PostulantesTable
        postulantes={postulantes}
        loading={loading}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={cambiarPagina}
        onPageSizeChange={cambiarPageSize}
        onSort={handleSort}
        sortBy={filtros.sortBy}
        sortOrder={filtros.sortOrder}
      />
    </div>
  );
});