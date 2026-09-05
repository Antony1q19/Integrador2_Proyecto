"use client";

import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { FiltrosAnuncios } from "@/features/anuncios/hooks/useAnunciosFilters";

interface AnunciosFiltrosProps {
  filtros: FiltrosAnuncios;
  actualizarFiltro: <K extends keyof FiltrosAnuncios>(
    campo: K,
    valor: FiltrosAnuncios[K]
  ) => void;
  limpiarFiltros: () => void;
  cargosDisponibles: string[];
}

const estilosSelect =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function AnunciosFiltros({
  filtros,
  actualizarFiltro,
  limpiarFiltros,
  cargosDisponibles,
}: AnunciosFiltrosProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Buscador */}
      <input
        type="text"
        value={filtros.busqueda}
        onChange={(e) => actualizarFiltro("busqueda", e.target.value)}
        placeholder="Buscar por cargo o empresa..."
        className={`mb-3 w-full ${estilosSelect}`}
      />

      {/* Fila de filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtros.empresaId}
          onChange={(e) =>
            actualizarFiltro(
              "empresaId",
              e.target.value === "todas" ? "todas" : Number(e.target.value)
            )
          }
          className={estilosSelect}
        >
          <option value="todas">Todas las empresas</option>
          {empresasMock.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.razonSocial}
            </option>
          ))}
        </select>

        <select
          value={filtros.cargo}
          onChange={(e) => actualizarFiltro("cargo", e.target.value)}
          className={estilosSelect}
        >
          <option value="todos">Todos los cargos</option>
          {cargosDisponibles.map((cargo) => (
            <option key={cargo} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>

        <select
          value={filtros.estado}
          onChange={(e) =>
            actualizarFiltro("estado", e.target.value as EstadoAnuncio | "todos")
          }
          className={estilosSelect}
        >
          <option value="todos">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="En proceso">En proceso</option>
          <option value="Cerrado">Cerrado</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={(e) => actualizarFiltro("fechaDesde", e.target.value)}
            className={estilosSelect}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={(e) => actualizarFiltro("fechaHasta", e.target.value)}
            className={estilosSelect}
          />
        </div>

        <button
          type="button"
          onClick={limpiarFiltros}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}