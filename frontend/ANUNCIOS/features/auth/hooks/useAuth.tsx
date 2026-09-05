// features/auth/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Usuario } from '../types';
import {
  iniciarSesion as iniciarSesionService,
  cerrarSesion as cerrarSesionService,
} from '@/features/auth/services/authService';

interface AuthContextValue {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(email: string, password: string) {
    setCargando(true);
    try {
      const usuarioObtenido = await iniciarSesionService(email, password);
      setUsuario(usuarioObtenido);
    } finally {
      setCargando(false);
    }
  }

  async function cerrarSesion() {
    setCargando(true);
    try {
      await cerrarSesionService();
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaAutenticado: usuario !== null,
        cargando,
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
}