// features/comunicaciones/components/MessageTemplates.tsx
"use client";

import { useState } from "react";
import { PlantillaMensaje, PLANTILLAS } from "../types/comunicaciones.types";
import { FileText, ChevronDown, X } from "lucide-react";

interface MessageTemplatesProps {
  onSelectTemplate: (plantilla: PlantillaMensaje) => void;
  disabled?: boolean;
}

const categoriaColores: Record<PlantillaMensaje["categoria"], string> = {
  entrevista: "bg-blue-100 text-blue-700",
  documentos: "bg-purple-100 text-purple-700",
  seguimiento: "bg-amber-100 text-amber-700",
  contratacion: "bg-green-100 text-green-700",
  general: "bg-slate-100 text-slate-700",
};

export function MessageTemplates({
  onSelectTemplate,
  disabled = false,
}: MessageTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (plantilla: PlantillaMensaje) => {
    onSelectTemplate(plantilla);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Plantillas</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Plantillas
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              {PLANTILLAS.map((plantilla) => (
                <button
                  key={plantilla.id}
                  onClick={() => handleSelect(plantilla)}
                  className="w-full rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {plantilla.nombre}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${categoriaColores[plantilla.categoria]}`}
                    >
                      {plantilla.categoria}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {plantilla.descripcion}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}