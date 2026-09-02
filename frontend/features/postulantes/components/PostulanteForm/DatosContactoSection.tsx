// features/postulantes/components/PostulanteForm/DatosContactoSection.tsx
"use client";

import { PostulanteFormData, PostulanteFormErrors } from "../../types/postulante.types";

interface DatosContactoSectionProps {
  formData: PostulanteFormData;
  errors: PostulanteFormErrors;
  onChange: (field: keyof PostulanteFormData, value: string) => void;
}

export function DatosContactoSection({
  formData,
  errors,
  onChange,
}: DatosContactoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="ejemplo@correo.com"
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => onChange("telefono", e.target.value)}
            placeholder="987654321"
            className={`mt-1 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.telefono
                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          />
          {errors.telefono && (
            <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>
          )}
        </div>

        {/* Dirección */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion || ""}
            onChange={(e) => onChange("direccion", e.target.value)}
            placeholder="Av. Principal 123, Lima"
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>
    </div>
  );
}