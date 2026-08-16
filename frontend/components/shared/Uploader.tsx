// components/shared/Uploader.tsx
"use client";

import { useRef, useState } from "react";

interface UploaderProps {
  onFileSelected: (file: File) => void;
  formatosAceptados?: string;
  tamanioMaximoMb?: number;
  cargando?: boolean;
}

export function Uploader({
  onFileSelected,
  formatosAceptados = ".pdf,.jpg,.jpeg,.png",
  tamanioMaximoMb = 5,
  cargando = false,
}: UploaderProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validarYEnviar = (file: File) => {
    setError(null);
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!formatosAceptados.includes(extension)) {
      setError(`Formato no permitido. Usa: ${formatosAceptados}`);
      return;
    }
    if (file.size > tamanioMaximoMb * 1024 * 1024) {
      setError(`El archivo supera ${tamanioMaximoMb} MB.`);
      return;
    }
    onFileSelected(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const file = e.dataTransfer.files?.[0];
          if (file) validarYEnviar(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          arrastrando ? "border-[#1D2B53] bg-slate-50" : "border-gray-200 hover:border-gray-300",
          cargando ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mb-2 text-gray-400">
          <path
            d="M12 16V4M12 4L7 9M12 4L17 9M5 20H19"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm text-gray-600">
          {cargando ? "Subiendo archivo…" : "Arrastra un archivo o haz clic para seleccionarlo"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {formatosAceptados.replaceAll(".", "").toUpperCase()} · máx. {tamanioMaximoMb}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={formatosAceptados}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validarYEnviar(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
