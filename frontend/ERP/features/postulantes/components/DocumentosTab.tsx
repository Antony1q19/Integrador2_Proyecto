// features/postulantes/components/DocumentosTab.tsx
"use client";

import { useRef, useState } from "react";
import { DocumentoPostulante } from "../types/postulante.types";
import { Uploader, validarArchivo } from "@/components/shared/Uploader";
import { useProgresoSimulado } from "@/components/shared/useProgresoSimulado";

const ETIQUETAS_TIPO: Record<DocumentoPostulante["tipo"], string> = {
  CV: "CV",
  DNI: "DNI",
  CERTIFICADO: "Certificado",
  OTRO: "Otro",
};

const FORMATOS_ACEPTADOS = ".pdf,.jpg,.jpeg,.png";
const TAMANIO_MAXIMO_MB = 5;

// Ícono según el FORMATO real del archivo (no la categoría), para que se
// note de un vistazo si es un PDF o una imagen.
function iconoPorArchivo(nombreArchivo: string): string {
  const extension = nombreArchivo.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "📕";
  if (extension === "jpg" || extension === "jpeg" || extension === "png") return "🖼️";
  return "📎";
}

interface DocumentosTabProps {
  documentos: DocumentoPostulante[];
  guardando: boolean;
  onSubir: (archivo: File, tipo: DocumentoPostulante["tipo"]) => Promise<void>;
  onReemplazar: (documentoId: string, archivo: File) => Promise<void>;
  onEliminar: (documentoId: string) => Promise<void>;
}

export function DocumentosTab({
  documentos,
  guardando,
  onSubir,
  onReemplazar,
  onEliminar,
}: DocumentosTabProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<DocumentoPostulante["tipo"]>("CV");
  const [reemplazandoId, setReemplazandoId] = useState<string | null>(null);
  const [errorReemplazo, setErrorReemplazo] = useState<string | null>(null);
  const inputReemplazoRef = useRef<HTMLInputElement>(null);
  const { progreso, activo, ejecutar } = useProgresoSimulado();

  const handleDescargar = (doc: DocumentoPostulante) => {
    if (!doc.url) return;
    const enlace = document.createElement("a");
    enlace.href = doc.url;
    enlace.download = doc.nombreArchivo;
    enlace.click();
  };

  const handleVer = (doc: DocumentoPostulante) => {
    if (!doc.url) return;
    window.open(doc.url, "_blank", "noopener,noreferrer");
  };

  const abrirSelectorReemplazo = (documentoId: string) => {
    setErrorReemplazo(null);
    setReemplazandoId(documentoId);
    inputReemplazoRef.current?.click();
  };

  const handleArchivoReemplazo = async (file: File) => {
    setErrorReemplazo(null);
    const mensajeError = validarArchivo(file, FORMATOS_ACEPTADOS, TAMANIO_MAXIMO_MB);
    if (mensajeError) {
      setErrorReemplazo(mensajeError);
      setReemplazandoId(null);
      return;
    }
    const documentoId = reemplazandoId;
    if (!documentoId) return;
    try {
      await ejecutar(() => onReemplazar(documentoId, file));
    } catch (e) {
      setErrorReemplazo(e instanceof Error ? e.message : "No se pudo reemplazar el documento.");
    } finally {
      setReemplazandoId(null);
    }
  };

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
        disabled={guardando}
        formatosAceptados={FORMATOS_ACEPTADOS}
        tamanioMaximoMb={TAMANIO_MAXIMO_MB}
        onFileSelected={(file) => onSubir(file, tipoSeleccionado)}
      />

      {/* Input oculto compartido para la acción "Reemplazar" de cada fila */}
      <input
        ref={inputReemplazoRef}
        type="file"
        accept={FORMATOS_ACEPTADOS}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleArchivoReemplazo(file);
          e.target.value = "";
        }}
      />
      {errorReemplazo && <p className="text-xs text-red-600">{errorReemplazo}</p>}

      {documentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Aún no se han cargado documentos para este postulante.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {documentos.map((doc) => {
            const enReemplazo = activo && reemplazandoId === doc.id;
            return (
              <li key={doc.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-lg">{iconoPorArchivo(doc.nombreArchivo)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {doc.nombreArchivo}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {ETIQUETAS_TIPO[doc.tipo]}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-gray-400">
                        {doc.tamanioKb} KB · {new Date(doc.fechaCarga).toLocaleDateString("es-PE")}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleVer(doc)}
                      disabled={!doc.url}
                      title={doc.url ? "Ver documento" : "Sin archivo disponible (dato de ejemplo)"}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDescargar(doc)}
                      disabled={!doc.url}
                      title={doc.url ? "Descargar documento" : "Sin archivo disponible (dato de ejemplo)"}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      Descargar
                    </button>
                    <button
                      onClick={() => abrirSelectorReemplazo(doc.id)}
                      disabled={activo || guardando}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Reemplazar
                    </button>
                    <button
                      onClick={() => onEliminar(doc.id)}
                      disabled={activo || guardando}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {enReemplazo && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-[#1D2B53] transition-all duration-150 ease-out"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-gray-400">
                      Reemplazando… {progreso}%
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
