// features/postulantes/components/VisorDocumentoModal.tsx
//
// Ventana (modal) para VER un documento sin salir de la ficha: muestra el PDF o la
// imagen adentro y trae el botón "Descargar". El archivo se pide a nuestro propio
// servidor (`documento.url`), que lo entrega con la sesión del usuario; el navegador
// lo guarda en memoria (un "blob") y desde ahí se muestra o se descarga.
"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { DocumentoPostulante } from "../types/postulante.types";
import { descargarArchivoDelDocumento } from "../utils/archivo";

interface VisorDocumentoModalProps {
  documento: DocumentoPostulante;
  onCerrar: () => void;
}

interface ArchivoCargado {
  urlLocal: string; // dirección temporal (blob:) del archivo ya descargado
  tipo: string; // ej. "application/pdf", "image/png"
}

export function VisorDocumentoModal({ documento, onCerrar }: VisorDocumentoModalProps) {
  const [archivo, setArchivo] = useState<ArchivoCargado | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Descarga el archivo al abrir el modal y libera la memoria al cerrarlo.
  useEffect(() => {
    let cancelado = false;
    let urlLocal: string | null = null;

    fetch(documento.url ?? "")
      .then(async (res) => {
        if (!res.ok) {
          const cuerpo = await res.json().catch(() => null);
          throw new Error(cuerpo?.detail ?? cuerpo?.error ?? "No se pudo abrir el documento.");
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelado) return; // se cerró el modal antes de que llegara: no hay nada que mostrar
        urlLocal = URL.createObjectURL(blob);
        setArchivo({ urlLocal, tipo: blob.type });
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo abrir el documento.");
      });

    return () => {
      cancelado = true;
      if (urlLocal) URL.revokeObjectURL(urlLocal);
    };
  }, [documento.url]);

  // Escape cierra el modal.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  const esImagen = archivo?.tipo.startsWith("image/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-label={`Documento ${documento.nombreArchivo}`}
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <p className="truncate text-sm font-semibold text-slate-800">{documento.nombreArchivo}</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => descargarArchivoDelDocumento(documento)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D2B53] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#16224A]"
            >
              <Download size={14} /> Descargar
            </button>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50">
          {error ? (
            <p className="px-6 text-center text-sm text-red-600">{error}</p>
          ) : !archivo ? (
            <p className="text-sm text-slate-400">Cargando documento…</p>
          ) : esImagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- es una imagen local (blob:), no aplica next/image
            <img src={archivo.urlLocal} alt={documento.nombreArchivo} className="max-h-full max-w-full object-contain" />
          ) : (
            <iframe src={archivo.urlLocal} title={documento.nombreArchivo} className="h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}
