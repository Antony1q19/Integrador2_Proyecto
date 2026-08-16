// features/postulantes/components/DocumentosTab.tsx
"use client";

import { useState } from "react";
import { DocumentoPostulante } from "../types/postulante.types";
import { Uploader } from "@/components/shared/Uploader";

const ICONOS_TIPO: Record<DocumentoPostulante["tipo"], string> = {
  CV: "📄",
  DNI: "🪪",
  CERTIFICADO: "🎓",
  OTRO: "📎",
};

interface DocumentosTabProps {
  documentos: DocumentoPostulante[];
  guardando: boolean;
  onSubir: (archivo: File, tipo: DocumentoPostulante["tipo"]) => Promise<void>;
  onEliminar: (documentoId: string) => Promise<void>;
}

export function DocumentosTab({ documentos, guardando, onSubir, onEliminar }: DocumentosTabProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<DocumentoPostulante["tipo"]>("CV");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">
            Tipo de documento
          </label>
          <select
            value={tipoSeleccionado}
            onChange={(e) => setTipoSeleccionado(e.target.value as DocumentoPostulante["tipo"])}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#1D2B53] focus:outline-none focus:ring-1 focus:ring-[#1D2B53]"
          >
            <option value="CV">Curriculum Vitae</option>
            <option value="DNI">Documento de identidad</option>
            <option value="CERTIFICADO">Certificado</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
      </div>

      <Uploader
        cargando={guardando}
        onFileSelected={(file) => onSubir(file, tipoSeleccionado)}
      />

      {documentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Aún no se han cargado documentos para este postulante.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{ICONOS_TIPO[doc.tipo]}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{doc.nombreArchivo}</p>
                  <p className="font-mono text-[11px] text-gray-400">
                    {doc.tamanioKb} KB · {new Date(doc.fechaCarga).toLocaleDateString("es-PE")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onEliminar(doc.id)}
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
