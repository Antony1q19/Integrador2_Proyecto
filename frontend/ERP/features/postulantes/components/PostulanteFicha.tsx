// features/postulantes/components/PostulanteFicha.tsx
"use client";

import { useState } from "react";
import { usePostulanteDetalle } from "../hooks/usePostulanteDetalle";
import { EstadoBadge } from "./EstadoBadge";
import { Timeline } from "./Timeline";
import { DatosPersonalesTab } from "./DatosPersonalesTab";
import { DocumentosTab } from "./DocumentosTab";
import { EvaluacionesTab } from "./EvaluacionesTab";
import { EstadosTab } from "./EstadosTab";
import { PostulacionesTab } from "./PostulacionesTab";

type TabId = "datos" | "documentos" | "evaluaciones" | "estados" | "postulaciones";

const TABS: { id: TabId; label: string }[] = [
  { id: "datos", label: "Datos personales" },
  { id: "documentos", label: "Documentos" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "estados", label: "Historial de estados" },
  { id: "postulaciones", label: "Dónde ha postulado" },
];

function iniciales(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

export function PostulanteFicha({ id }: { id: string }) {
  const [tabActivo, setTabActivo] = useState<TabId>("datos");
  const {
    postulante,
    loading,
    error,
    guardando,
    guardarDatosPersonales,
    subirDocumento,
    reemplazarDocumento,
    eliminarDocumento,
    registrarEvaluacion,
    cambiarEstado,
    actualizarResultadoPostulacion,
  } = usePostulanteDetalle(id);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-24 rounded-xl bg-gray-100" />
        <div className="h-10 rounded-lg bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (error || !postulante) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-gray-500">
          {error ?? "No se encontró información para este postulante."}
        </p>
      </div>
    );
  }

  const { datosPersonales: d } = postulante;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Encabezado */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1D2B53] text-sm font-semibold text-white">
              {iniciales(d.nombres, d.apellidos)}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {d.nombres} {d.apellidos}
              </h1>
              <p className="text-sm text-gray-500">
                {d.cargoPostulado} · {d.empresaCliente}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge estado={postulante.estadoActual} />
            <button className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Enviar WhatsApp
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <Timeline estadoActual={postulante.estadoActual} />
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex overflow-x-auto border-b border-gray-100 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id)}
              className={[
                "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                tabActivo === tab.id ? "text-[#1D2B53]" : "text-gray-400 hover:text-gray-600",
              ].join(" ")}
            >
              {tab.label}
              {tabActivo === tab.id && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#1D2B53]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tabActivo === "datos" && (
            <DatosPersonalesTab
              datos={d}
              guardando={guardando}
              onGuardar={guardarDatosPersonales}
              formacionAcademica={postulante.formacionAcademica}
              idiomas={postulante.idiomas}
              experiencia={postulante.experiencia}
            />
          )}
          {tabActivo === "documentos" && (
            <DocumentosTab
              documentos={postulante.documentos}
              guardando={guardando}
              onSubir={subirDocumento}
              onReemplazar={reemplazarDocumento}
              onEliminar={eliminarDocumento}
            />
          )}
          {tabActivo === "evaluaciones" && (
            <EvaluacionesTab
              evaluaciones={postulante.evaluaciones}
              guardando={guardando}
              onRegistrar={registrarEvaluacion}
            />
          )}
          {tabActivo === "estados" && (
            <EstadosTab
              estadoActual={postulante.estadoActual}
              historial={postulante.historialEstados}
              guardando={guardando}
              onCambiarEstado={cambiarEstado}
            />
          )}
          {tabActivo === "postulaciones" && (
            <PostulacionesTab
              postulanteId={postulante.id}
              resultadosPostulacion={postulante.resultadosPostulacion}
              guardando={guardando}
              onActualizarResultado={actualizarResultadoPostulacion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
