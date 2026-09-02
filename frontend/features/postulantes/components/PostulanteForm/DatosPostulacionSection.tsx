// features/postulantes/components/PostulanteForm/DatosPostulacionSection.tsx
"use client";

import { PostulanteFormData, PostulanteFormErrors, FUENTES_RECLUTAMIENTO } from "../../types/postulante.types";

interface DatosPostulacionSectionProps {
  formData: PostulanteFormData;
  errors: PostulanteFormErrors;
  empresasOptions: string[];
  cargosOptions: string[];
  onChange: (field: keyof PostulanteFormData, value: string) => void;
}

export function DatosPostulacionSection({
  formData,
  errors,
  empresasOptions,
  cargosOptions,
  onChange,
}: DatosPostulacionSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Cargo Postulado */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cargo Postulado <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.cargoPostulado}
            onChange={(e) => onChange("cargoPostulado", e.target.value)}
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.cargoPostulado
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          >
            <option value="">Selecciona un cargo</option>
            {cargosOptions.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
          {errors.cargoPostulado && (
            <p className="mt-1 text-xs text-red-600">{errors.cargoPostulado}</p>
          )}
        </div>

        {/* Empresa Cliente */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Empresa Cliente <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.empresaCliente}
            onChange={(e) => onChange("empresaCliente", e.target.value)}
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.empresaCliente
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          >
            <option value="">Selecciona una empresa</option>
            {empresasOptions.map((empresa) => (
              <option key={empresa} value={empresa}>
                {empresa}
              </option>
            ))}
          </select>
          {errors.empresaCliente && (
            <p className="mt-1 text-xs text-red-600">{errors.empresaCliente}</p>
          )}
        </div>

        {/* Fuente de Reclutamiento */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Fuente de Reclutamiento
          </label>
          <select
            value={formData.fuenteReclutamiento || ""}
            onChange={(e) => onChange("fuenteReclutamiento", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Selecciona una fuente</option>
            {FUENTES_RECLUTAMIENTO.map((fuente) => (
              <option key={fuente} value={fuente}>
                {fuente}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}