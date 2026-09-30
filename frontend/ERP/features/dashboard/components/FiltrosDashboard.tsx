// features/dashboard/components/FiltrosDashboard.tsx
//
// Barra de filtros del Dashboard: empresa y rango de fechas (con rangos rápidos), más los botones
// para exportar e imprimir. Se oculta al imprimir.
"use client";

import { Building2, CalendarRange, Download, Printer } from "lucide-react";
import { Empresa } from "@/features/empresas/types/empresa";
import { FiltrosDashboard as Filtros } from "../types/dashboard";
import { ATAJOS_RANGO } from "../utils/fechas";

interface FiltrosDashboardProps {
  filtros: Filtros;
  hoy: string;
  empresas: Empresa[];
  cargando: boolean;
  puedeExportar: boolean;
  onCambiar: (cambios: Partial<Filtros>) => void;
  onExportar: () => void;
  onImprimir: () => void;
}

const estiloCampo =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200";

export function FiltrosDashboard({
  filtros,
  hoy,
  empresas,
  cargando,
  puedeExportar,
  onCambiar,
  onExportar,
  onImprimir,
}: FiltrosDashboardProps) {
  const rangoInvalido = filtros.desde > filtros.hasta;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm print:hidden">
      <div className="flex flex-wrap items-end gap-4">
        {/* Empresa */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Building2 size={13} /> Empresa
          </label>
          <select
            value={filtros.empresaId ?? ""}
            onChange={(e) => onCambiar({ empresaId: e.target.value === "" ? null : Number(e.target.value) })}
            className={`min-w-[220px] ${estiloCampo}`}
          >
            <option value="">{empresas.length > 1 ? "Todas las empresas" : "Todas mis empresas"}</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.razonSocial}
              </option>
            ))}
          </select>
        </div>

        {/* Rango de fechas */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarRange size={13} /> Desde
          </label>
          <input
            type="date"
            value={filtros.desde}
            max={filtros.hasta || hoy}
            onChange={(e) => e.target.value && onCambiar({ desde: e.target.value })}
            className={estiloCampo}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Hasta</label>
          <input
            type="date"
            value={filtros.hasta}
            min={filtros.desde}
            max={hoy}
            onChange={(e) => e.target.value && onCambiar({ hasta: e.target.value })}
            className={estiloCampo}
          />
        </div>

        {/* Acciones */}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onExportar}
            disabled={!puedeExportar || cargando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={onImprimir}
            disabled={!puedeExportar || cargando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Rangos rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400">Rango rápido:</span>
        {ATAJOS_RANGO.map((atajo) => {
          const rango = atajo.calcular(hoy);
          const activo = rango.desde === filtros.desde && rango.hasta === filtros.hasta;
          return (
            <button
              key={atajo.id}
              type="button"
              onClick={() => onCambiar(rango)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activo ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {atajo.etiqueta}
            </button>
          );
        })}
        {rangoInvalido && (
          <span className="text-xs font-medium text-red-600">La fecha &quot;desde&quot; no puede ser posterior a &quot;hasta&quot;.</span>
        )}
      </div>
    </div>
  );
}
