"use client";

import Link from "next/link";
import { useEmpresaForm } from "@/features/empresas/hooks/useEmpresaForm";
import { EmpresaFormProps } from "@/features/empresas/types/formProp";
import { EmpresaFormData } from "@/features/empresas/types/formData";

export default function EmpresaForm({
  initialData,
  onSubmitValido,
  submitLabel,
  cancelHref,
}: EmpresaFormProps) {
  const { formData, errors, enviando, handleChange, handleSubmit } =
    useEmpresaForm({ initialData, onSubmitValido });

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
    >
      <div>
        <label
          htmlFor="razonSocial"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Razón Social *
        </label>
        <input
          type="text"
          id="razonSocial"
          name="razonSocial"
          value={formData.razonSocial}
          onChange={handleChange}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            errors.razonSocial
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-300 focus:ring-indigo-200"
          }`}
          placeholder="Ej: Consultora Andina S.A.C."
        />
        {errors.razonSocial && (
          <p className="mt-1 text-xs text-red-500">{errors.razonSocial}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="ruc"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          RUC *
        </label>
        <input
          type="text"
          id="ruc"
          name="ruc"
          value={formData.ruc}
          onChange={handleChange}
          maxLength={11}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            errors.ruc
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-300 focus:ring-indigo-200"
          }`}
          placeholder="11 dígitos, ej: 20481234567"
        />
        {errors.ruc && (
          <p className="mt-1 text-xs text-red-500">{errors.ruc}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contactoNombre"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Persona de Contacto *
        </label>
        <input
          type="text"
          id="contactoNombre"
          name="contactoNombre"
          value={formData.contactoNombre}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Ej: María Gutiérrez"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contactoEmail"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Email de Contacto *
          </label>
          <input
            type="text"
            id="contactoEmail"
            name="contactoEmail"
            value={formData.contactoEmail}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.contactoEmail
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
            placeholder="nombre@empresa.com"
          />
          {errors.contactoEmail && (
            <p className="mt-1 text-xs text-red-500">
              {errors.contactoEmail}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="contactoTelefono"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Teléfono *
          </label>
          <input
            type="text"
            id="contactoTelefono"
            name="contactoTelefono"
            value={formData.contactoTelefono}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.contactoTelefono
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
            placeholder="+51 987 654 321"
          />
          {errors.contactoTelefono && (
            <p className="mt-1 text-xs text-red-500">
              {errors.contactoTelefono}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="sector"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Sector
        </label>
        <select
          id="sector"
          name="sector"
          value={formData.sector}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Selecciona un sector</option>
          <option value="Tecnología">Tecnología</option>
          <option value="Logística">Logística</option>
          <option value="Finanzas">Finanzas</option>
          <option value="Retail">Retail</option>
          <option value="Salud">Salud</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}