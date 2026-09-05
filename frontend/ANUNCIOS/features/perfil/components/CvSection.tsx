// features/perfil/components/CvSection.tsx
'use client';

import { useRef, useState } from 'react';
import { FileText, UploadCloud, Trash2 } from 'lucide-react';
import { CurriculumAdjunto } from '../types';
import { SectionCard } from './SectionCard';

const FORMATOS_ACEPTADOS = '.pdf,.doc,.docx';
const TAMANIO_MAXIMO_MB = 5;

interface CvSectionProps {
  cv?: CurriculumAdjunto;
  onSubir: (archivo: File) => Promise<void>;
  onEliminar: () => Promise<void>;
}

function validarArchivo(file: File): string | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FORMATOS_ACEPTADOS.includes(extension)) {
    return `Formato no permitido. Usa: ${FORMATOS_ACEPTADOS}`;
  }
  if (file.size > TAMANIO_MAXIMO_MB * 1024 * 1024) {
    return `El archivo supera ${TAMANIO_MAXIMO_MB} MB.`;
  }
  return null;
}

export function CvSection({ cv, onSubir, onEliminar }: CvSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const procesar = async (file: File) => {
    setError(null);
    const mensaje = validarArchivo(file);
    if (mensaje) {
      setError(mensaje);
      return;
    }

    setSubiendo(true);
    setProgreso(0);
    const intervalo = setInterval(() => {
      setProgreso((p) => (p < 90 ? p + Math.random() * 15 + 5 : p));
    }, 150);

    try {
      await onSubir(file);
      setProgreso(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el archivo.');
    } finally {
      clearInterval(intervalo);
      setTimeout(() => {
        setSubiendo(false);
        setProgreso(0);
      }, 350);
    }
  };

  return (
    <SectionCard titulo="Curriculum vitae">
      {cv && !subiendo ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <FileText size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{cv.nombreArchivo}</p>
              <p className="font-mono text-[11px] text-gray-400">
                {cv.tamanioKb} KB · {new Date(cv.fechaCarga).toLocaleDateString('es-PE')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {cv.url && (
              <a
                href={cv.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-50"
              >
                Ver
              </a>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors duration-150 hover:bg-purple-50 active:scale-[0.97]"
            >
              Reemplazar
            </button>
            <button
              onClick={onEliminar}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 active:scale-[0.97]"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!subiendo) setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (subiendo) return;
            const file = e.dataTransfer.files?.[0];
            if (file) procesar(file);
          }}
          onClick={() => !subiendo && inputRef.current?.click()}
          className={[
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors duration-150',
            arrastrando ? 'border-purple-500 bg-purple-50/50' : 'border-gray-300 hover:border-gray-400',
            subiendo ? 'pointer-events-none opacity-70' : '',
          ].join(' ')}
        >
          <UploadCloud size={24} className="mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {subiendo ? 'Subiendo CV…' : 'Arrastra tu CV o haz clic para seleccionarlo'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {FORMATOS_ACEPTADOS.replaceAll('.', '').toUpperCase()} · máx. {TAMANIO_MAXIMO_MB}MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={FORMATOS_ACEPTADOS}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) procesar(file);
          e.target.value = '';
        }}
      />

      {subiendo && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-purple-700 transition-[width] duration-150 ease-out"
              style={{ width: `${Math.min(Math.round(progreso), 100)}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {Math.min(Math.round(progreso), 100)}%
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </SectionCard>
  );
}
