// features/postulantes/components/PostulanteForm/DatosPersonalesSection.tsx
// Sección 1 del formulario con accesibilidad htmlFor e id
"use client";

import { useId } from "react";
import { PostulanteFormData, PostulanteFormErrors, TIPOS_DOCUMENTO } from "../../types/postulante.types";

interface DatosPersonalesSectionProps {
  formData: PostulanteFormData;
  errors: PostulanteFormErrors;
  onChange: (field: keyof PostulanteFormData, value: string) => void;
}

export function DatosPersonalesSection({
  formData,
  errors,
  onChange,
}: DatosPersonalesSectionProps) {
  const nombresId = useId();
  const apellidosId = useId();
  const docTipoId = useId();
  const docNumId = useId();
  const fechaNacId = useId();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Nombres */}
        <div>
          <label htmlFor={nombresId} className="block text-sm font-medium text-slate-700">
            Nombres <span className="text-red-500">*</span>
          </label>
          <input
            id={nombresId}
            type="text"
            value={formData.nombres}
            onChange={(e) => onChange("nombres", e.target.value)}
            placeholder="Ej: Juan Carlos"
            aria-required="true"
            aria-invalid={Boolean(errors.nombres)}
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.nombres
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-primary-500 focus:ring-primary-200"
            }`}
          />
          {errors.nombres && (
            <p className="mt-1 text-xs text-red-600">{errors.nombres}</p>
          )}
        </div>

        {/* Apellidos */}
        <div>
          <label htmlFor={apellidosId} className="block text-sm font-medium text-slate-700">
            Apellidos <span className="text-red-500">*</span>
          </label>
          <input
            id={apellidosId}
            type="text"
            value={formData.apellidos}
            onChange={(e) => onChange("apellidos", e.target.value)}
            placeholder="Ej: Pérez González"
            aria-required="true"
            aria-invalid={Boolean(errors.apellidos)}
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.apellidos
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-primary-500 focus:ring-primary-200"
            }`}
          />
          {errors.apellidos && (
            <p className="mt-1 text-xs text-red-600">{errors.apellidos}</p>
          )}
        </div>

        {/* Tipo de Documento */}
        <div>
          <label htmlFor={docTipoId} className="block text-sm font-medium text-slate-700">
            Tipo de Documento <span className="text-red-500">*</span>
          </label>
          <select
            id={docTipoId}
            value={formData.documentoTipo}
            onChange={(e) => onChange("documentoTipo", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        {/* Número de Documento */}
        <div>
          <label htmlFor={docNumId} className="block text-sm font-medium text-slate-700">
            Número de Documento <span className="text-red-500">*</span>
          </label>
          <input
            id={docNumId}
            type="text"
            value={formData.documentoNumero}
            onChange={(e) => onChange("documentoNumero", e.target.value)}
            placeholder={formData.documentoTipo === "DNI" ? "12345678" : "Ej: AB123456"}
            aria-required="true"
            aria-invalid={Boolean(errors.documentoNumero)}
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.documentoNumero
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-primary-500 focus:ring-primary-200"
            }`}
          />
          {errors.documentoNumero && (
            <p className="mt-1 text-xs text-red-600">{errors.documentoNumero}</p>
          )}
        </div>

        {/* Fecha de Nacimiento */}
        <div className="md:col-span-2">
          <label htmlFor={fechaNacId} className="block text-sm font-medium text-slate-700">
            Fecha de Nacimiento <span className="text-red-500">*</span>
          </label>
          <input
            id={fechaNacId}
            type="date"
            value={formData.fechaNacimiento}
            onChange={(e) => onChange("fechaNacimiento", e.target.value)}
            aria-required="true"
            aria-invalid={Boolean(errors.fechaNacimiento)}
            className={`mt-1 w-full max-w-xs rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.fechaNacimiento
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-primary-500 focus:ring-primary-200"
            }`}
          />
          {errors.fechaNacimiento && (
            <p className="mt-1 text-xs text-red-600">{errors.fechaNacimiento}</p>
          )}
        </div>
      </div>
    </div>
  );
}
