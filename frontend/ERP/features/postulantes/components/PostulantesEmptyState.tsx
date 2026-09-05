// features/postulantes/components/PostulantesEmptyState.tsx
"use client";

import { Users, FilterX } from "lucide-react";

interface PostulantesEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function PostulantesEmptyState({
  hasFilters = false,
  onClearFilters,
}: PostulantesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-slate-100 p-4">
        {hasFilters ? (
          <FilterX className="h-8 w-8 text-slate-400" />
        ) : (
          <Users className="h-8 w-8 text-slate-400" />
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        {hasFilters ? "No hay resultados con estos filtros" : "No hay postulantes registrados"}
      </h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        {hasFilters
          ? "Prueba ajustando los filtros o la búsqueda para encontrar lo que buscas."
          : "Comienza agregando tu primer postulante al sistema."}
      </p>
      {hasFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}