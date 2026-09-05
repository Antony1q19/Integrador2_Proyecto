// features/perfil/components/PerfilHeader.tsx
'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { PerfilPostulante } from '../types';

interface PerfilHeaderProps {
  perfil: PerfilPostulante;
  guardando: boolean;
  onCambiarFoto: (archivo: File) => Promise<void>;
}

function iniciales(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase();
}

export function PerfilHeader({ perfil, guardando, onCambiarFoto }: PerfilHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { datosPersonales: d } = perfil;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
      <div className="group relative shrink-0">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-purple-800 text-xl font-semibold text-white">
          {perfil.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            iniciales(d.nombres, d.apellidos)
          )}
        </div>
        <button
          type="button"
          disabled={guardando}
          onClick={() => inputRef.current?.click()}
          title="Cambiar foto"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-purple-800 text-white transition-transform duration-150 ease-out hover:bg-purple-900 active:scale-90 disabled:opacity-50"
        >
          <Camera size={13} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onCambiarFoto(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="min-w-0 text-center sm:text-left">
        <h1 className="text-lg font-semibold text-gray-900">
          {d.nombres} {d.apellidos}
        </h1>
        <p className="text-sm text-gray-500">{d.email}</p>
        <p className="mt-0.5 font-mono text-xs text-gray-400">
          {d.documentoTipo} {d.documentoNumero}
        </p>
      </div>
    </div>
  );
}
