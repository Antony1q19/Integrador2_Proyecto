// features/postulantes/components/PostulanteForm/SectionNavigation.tsx
"use client";

import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface SectionNavigationProps {
  currentSection: number;
  totalSections: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function SectionNavigation({
  currentSection,
  totalSections,
  onPrevious,
  onNext,
  onSubmit,
  isLoading,
}: SectionNavigationProps) {
  const isLastSection = currentSection === totalSections - 1;

  return (
    <div className="flex flex-col gap-4 pt-6 border-t border-slate-200">
      {/* Indicador de progreso */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSections }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentSection
                ? "w-8 bg-indigo-600"
                : index < currentSection
                ? "w-4 bg-indigo-300"
                : "w-4 bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Botones de navegación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentSection === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        {isLastSection ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Guardar Postulante
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}