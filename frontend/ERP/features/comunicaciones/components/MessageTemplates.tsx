// features/comunicaciones/components/MessageTemplates.tsx
// Botón "Plantillas" junto al cuadro de texto: inserta un texto listo (editable) en el mensaje.
// Las plantillas se guardan en la base (las comparte todo el equipo) y Admin/RRHH pueden editarlas.
"use client";

import { useState } from "react";
import { FileText, ChevronDown, Pencil, X } from "lucide-react";
import { usePermisos } from "@/lib/usePermisos";
import { PlantillaMensaje } from "../types/comunicaciones.types";
import { fetchPlantillasRapidas } from "../services/plantillasService";
import { EditarPlantillaRapidaModal } from "./EditarPlantillaRapidaModal";

interface MessageTemplatesProps {
  onSelectTemplate: (plantilla: PlantillaMensaje) => void;
  disabled?: boolean;
}

const categoriaColores: Record<string, string> = {
  entrevista: "bg-blue-100 text-blue-700",
  documentos: "bg-purple-100 text-purple-700",
  seguimiento: "bg-amber-100 text-amber-700",
  contratacion: "bg-green-100 text-green-700",
  general: "bg-slate-100 text-slate-700",
};

export function MessageTemplates({ onSelectTemplate, disabled = false }: MessageTemplatesProps) {
  const { puedeGestionarPlantillasWhatsApp: puedeEditar } = usePermisos();
  const [isOpen, setIsOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<PlantillaMensaje | null>(null);

  const abrir = async () => {
    const abriendo = !isOpen;
    setIsOpen(abriendo);
    if (abriendo && plantillas === null) {
      try {
        setPlantillas(await fetchPlantillasRapidas());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las plantillas");
      }
    }
  };

  const handleSelect = (plantilla: PlantillaMensaje) => {
    onSelectTemplate(plantilla);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={abrir}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Plantillas</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plantillas</span>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && <p className="px-2 py-3 text-xs text-red-600">{error}</p>}
            {!error && plantillas === null && <p className="px-2 py-3 text-xs text-slate-500">Cargando…</p>}

            <div className="space-y-1">
              {plantillas?.map((plantilla) => (
                <div key={plantilla.id} className="group relative rounded-lg transition-colors hover:bg-slate-50">
                  <button onClick={() => handleSelect(plantilla)} className="w-full p-3 pr-10 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{plantilla.nombre}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${categoriaColores[plantilla.categoria] ?? categoriaColores.general}`}
                      >
                        {plantilla.categoria}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{plantilla.contenido}</p>
                  </button>
                  {puedeEditar && (
                    <button
                      onClick={() => setEditando(plantilla)}
                      title="Editar plantilla"
                      aria-label={`Editar ${plantilla.nombre}`}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-white hover:text-primary-600 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {editando && (
        <EditarPlantillaRapidaModal
          plantilla={editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(guardada) => {
            setPlantillas((prev) => prev?.map((p) => (p.id === guardada.id ? guardada : p)) ?? null);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}
