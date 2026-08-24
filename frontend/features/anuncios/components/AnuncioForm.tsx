"use client";

import { Controller } from "react-hook-form";
import Link from "next/link";
import { AnuncioFormData } from "@/features/anuncios/types/schema";
import { useAnuncioForm } from "@/features/anuncios/hooks/useAnuncioForm";
import EmpresaAutocomplete from "@/features/anuncios/components/EmpresaAutocomplete";

interface AnuncioFormProps {
  initialData?: Partial<AnuncioFormData>;
  onSubmitValido: (data: AnuncioFormData) => Promise<void> | void;
  submitLabel: string;
  cancelHref: string;
}

export default function AnuncioForm({
  initialData,
  onSubmitValido,
  submitLabel,
  cancelHref,
}: AnuncioFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useAnuncioForm({ initialData, onSubmitValido });

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
    >
      {/* Empresa Cliente (Autocomplete) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Empresa Cliente *
        </label>
        <Controller
          name="empresaId"
          control={control}
          render={({ field }) => (
            <EmpresaAutocomplete
              value={field.value}
              onChange={field.onChange}
              error={errors.empresaId?.message}
            />
          )}
        />
      </div>

      {/* Cargo */}
      <div>
        <label
          htmlFor="cargo"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Cargo *
        </label>
        <input
          type="text"
          id="cargo"
          {...register("cargo")}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            errors.cargo
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-300 focus:ring-indigo-200"
          }`}
          placeholder="Ej: Desarrollador Full Stack Senior"
        />
        {errors.cargo && (
          <p className="mt-1 text-xs text-red-500">{errors.cargo.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="descripcion"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Descripción del Puesto *
        </label>
        <textarea
          id="descripcion"
          rows={4}
          {...register("descripcion")}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            errors.descripcion
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-300 focus:ring-indigo-200"
          }`}
          placeholder="Describe las responsabilidades del puesto..."
        />
        {errors.descripcion && (
          <p className="mt-1 text-xs text-red-500">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      {/* Requisitos */}
      <div>
        <label
          htmlFor="requisitos"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Requisitos *
        </label>
        <textarea
          id="requisitos"
          rows={3}
          {...register("requisitos")}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            errors.requisitos
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-300 focus:ring-indigo-200"
          }`}
          placeholder="Ej: 3+ años de experiencia, conocimientos en..."
        />
        {errors.requisitos && (
          <p className="mt-1 text-xs text-red-500">
            {errors.requisitos.message}
          </p>
        )}
      </div>

      {/* Número de vacantes y Fecha límite */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="numeroVacantes"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            N.º de Vacantes *
          </label>
          <input
            type="number"
            id="numeroVacantes"
            {...register("numeroVacantes", { valueAsNumber: true })}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.numeroVacantes
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
          />
          {errors.numeroVacantes && (
            <p className="mt-1 text-xs text-red-500">
              {errors.numeroVacantes.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="fechaLimite"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Fecha Límite *
          </label>
          <input
            type="date"
            id="fechaLimite"
            {...register("fechaLimite")}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.fechaLimite
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
          />
          {errors.fechaLimite && (
            <p className="mt-1 text-xs text-red-500">
              {errors.fechaLimite.message}
            </p>
          )}
        </div>
      </div>

      {/* Salario Mínimo y Máximo */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="salarioMin"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Salario Mínimo (S/) *
          </label>
          <input
            type="number"
            id="salarioMin"
            {...register("salarioMin", { valueAsNumber: true })}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.salarioMin
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
          />
          {errors.salarioMin && (
            <p className="mt-1 text-xs text-red-500">
              {errors.salarioMin.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="salarioMax"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Salario Máximo (S/) *
          </label>
          <input
            type="number"
            id="salarioMax"
            {...register("salarioMax", { valueAsNumber: true })}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.salarioMax
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-300 focus:ring-indigo-200"
            }`}
          />
          {errors.salarioMax && (
            <p className="mt-1 text-xs text-red-500">
              {errors.salarioMax.message}
            </p>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}