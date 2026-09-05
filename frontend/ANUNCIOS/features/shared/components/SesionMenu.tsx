// features/shared/components/SesionMenu.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface SesionMenuProps {
  variant?: 'light' | 'dark';
}

export default function SesionMenu({ variant = 'light' }: SesionMenuProps) {
  const { usuario, estaAutenticado, cerrarSesion } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const esOscuro = variant === 'dark';

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  if (!estaAutenticado) {
    return (
      <Link
        href="/login"
        className={`text-sm font-medium transition-colors duration-150 ${
          esOscuro ? 'text-white hover:text-purple-200' : 'text-purple-800 hover:text-purple-900'
        }`}
      >
        Iniciar sesión
      </Link>
    );
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={() => setMenuAbierto((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97] ${
          esOscuro ? 'text-white hover:text-purple-200' : 'text-gray-700 hover:text-purple-800'
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            esOscuro ? 'bg-white/15' : 'bg-purple-100'
          }`}
        >
          <User size={16} className={esOscuro ? 'text-white' : 'text-purple-700'} />
        </div>
        {usuario?.nombre}
        <ChevronDown
          size={16}
          className={`transition-transform duration-150 ease-out ${menuAbierto ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg transition-[opacity,transform] duration-150 ease-out ${
          menuAbierto ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <Link
          href="/postulaciones"
          className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50"
          onClick={() => setMenuAbierto(false)}
        >
          Historial de postulaciones
        </Link>
        <Link
          href="/perfil"
          className="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50"
          onClick={() => setMenuAbierto(false)}
        >
          Perfil
        </Link>
        <button
          onClick={() => {
            setMenuAbierto(false);
            cerrarSesion();
          }}
          className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-gray-50"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
