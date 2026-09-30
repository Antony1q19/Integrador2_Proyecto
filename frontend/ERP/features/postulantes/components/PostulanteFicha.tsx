// features/postulantes/components/PostulanteFicha.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePostulanteDetalle } from "../hooks/usePostulanteDetalle";
import { EstadoBadge } from "./EstadoBadge";
import { Skeleton } from "@/components/shared/Skeleton";
import { DatosPersonalesTab } from "./DatosPersonalesTab";
import { DocumentosTab } from "./DocumentosTab";
import { EvaluacionesTab } from "./EvaluacionesTab";
import { PostulacionesTab } from "./PostulacionesTab";
import { EntrevistasTab } from "@/features/entrevistas/components/EntrevistasTab";
import { ContratacionTab } from "@/features/contrataciones/components/ContratacionTab";

type TabId = "datos" | "documentos" | "evaluaciones" | "postulaciones" | "entrevistas" | "contratacion";

const TABS: { id: TabId; label: string }[] = [
  { id: "datos", label: "Datos personales" },
  { id: "documentos", label: "Documentos" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "postulaciones", label: "Dónde ha postulado" },
  { id: "entrevistas", label: "Entrevistas" },
  { id: "contratacion", label: "Contratación" },
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
    actualizarEstadoPostulacion,
    refrescar,
  } = usePostulanteDetalle(id);

  if (loading) {
    return (
      <div aria-hidden className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="flex gap-2 border-b border-gray-100 px-4 py-3.5">
            {["w-28", "w-20", "w-24", "w-20", "w-24"].map((ancho, i) => (
              <Skeleton key={i} className={`h-4 ${ancho}`} />
            ))}
          </div>
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href="/postulantes"
        className="inline-flex items-center text-sm text-gray-500 hover:text-[#1D2B53]"
      >
        ← Volver
      </Link>

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
              <p className="text-sm text-gray-500">{d.direccion || "Dirección no registrada"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge estado={postulante.estadoActual} />
            <button className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Enviar WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex flex-wrap border-b border-gray-100 px-2">
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
          {tabActivo === "postulaciones" && (
            <PostulacionesTab
              nombrePostulante={`${d.nombres} ${d.apellidos}`}
              onContratado={refrescar}
              postulanteId={postulante.id}
              procesosPostulacion={postulante.procesosPostulacion}
              guardando={guardando}
              onActualizarEstado={actualizarEstadoPostulacion}
            />
          )}
          {tabActivo === "entrevistas" && <EntrevistasTab postulanteId={postulante.id} onCambio={refrescar} />}
          {tabActivo === "contratacion" && <ContratacionTab postulanteId={postulante.id} onCambio={refrescar} />}
        </div>
      </div>
    </div>
  );
}
