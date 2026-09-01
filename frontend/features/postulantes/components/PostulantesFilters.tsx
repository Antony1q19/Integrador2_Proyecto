// features/postulantes/components/PostulantesFilters.tsx
"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";

export interface FiltrosPostulantes {
  estado?: string;
  cargo?: string;
  empresa?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface PostulantesFiltersProps {
  filtros: FiltrosPostulantes;
  onFilterChange: (key: keyof FiltrosPostulantes, value: string) => void;
  onClearFilters: () => void;
  estadosOptions: string[];
  cargosOptions: string[];
  empresasOptions: string[];
}

export function PostulantesFilters({
  filtros,
  onFilterChange,
  onClearFilters,
  estadosOptions,
  cargosOptions,
  empresasOptions,
}: PostulantesFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = Object.values(filtros).some(v => v && v !== "");

  // Obtener etiqueta amigable para los estados
  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      POSTULADO: "Postulado",
      EN_EVALUACION: "En Evaluación",
      ENTREVISTA: "Entrevista",
      PRESELECCIONADO: "Preseleccionado",
      CONTRATADO: "Contratado",
      DESCARTADO: "Descartado",
    };
    return labels[estado] || estado;
  };

  return (
    <div className="space-y-4">
      {/* Botón toggle de filtros */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {Object.values(filtros).filter(v => v && v !== "").length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Filtro por Estado */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Estado del proceso
            </label>
            <select
              value={filtros.estado || ""}
              onChange={(e) => onFilterChange("estado", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos los estados</option>
              {estadosOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {getEstadoLabel(estado)}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Cargo */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Cargo postulado
            </label>
            <select
              value={filtros.cargo || ""}
              onChange={(e) => onFilterChange("cargo", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos los cargos</option>
              {cargosOptions.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Empresa */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Empresa cliente
            </label>
            <select
              value={filtros.empresa || ""}
              onChange={(e) => onFilterChange("empresa", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todas las empresas</option>
              {empresasOptions.map((empresa) => (
                <option key={empresa} value={empresa}>
                  {empresa}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Fecha */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={filtros.fechaInicio || ""}
                onChange={(e) => onFilterChange("fechaInicio", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={filtros.fechaFin || ""}
                onChange={(e) => onFilterChange("fechaFin", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}