// features/shared/components/SesionMenu.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface SesionMenuProps {
  variant?: 'light' | 'dark';
}

export default function SesionMenu({ variant = 'light' }: SesionMenuProps) {
  const { usuario, estaAutenticado, cerrarSesion } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esOscuro = variant === 'dark';

  return (
    <div className="relative">
      {!estaAutenticado ? (
        <Link
          href="/login"
          className={`text-sm font-medium transition-colors ${
            esOscuro
              ? 'text-white hover:text-purple-200'
              : 'text-purple-800 hover:text-purple-900'
          }`}
        >
          Iniciar sesión
        </Link>
      ) : (
        <>
          <button
            onClick={() => setMenuAbierto((prev) => !prev)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              esOscuro ? 'text-white hover:text-purple-200' : 'text-gray-700 hover:text-purple-800'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              esOscuro ? 'bg-white/15' : 'bg-purple-100'
            }`}>
              <User size={16} className={esOscuro ? 'text-white' : 'text-purple-700'} />
            </div>
            {usuario?.nombre}
            <ChevronDown size={16} />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <Link
                href="/postulaciones"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuAbierto(false)}
              >
                Historial de postulaciones
              </Link>
              <Link
                href="/perfil"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuAbierto(false)}
              >
                Perfil
              </Link>
              <button
                onClick={() => {
                  setMenuAbierto(false);
                  cerrarSesion();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}