// features/auth/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Usuario } from '../types';
import {
  iniciarSesion as iniciarSesionService,
  cerrarSesion as cerrarSesionService,
} from '@/features/auth/services/authService';
import { establecerPerfilActivo } from '@/features/perfil/services/perfilService';

interface AuthContextValue {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  // Establece la sesión directamente con un usuario ya conocido (ej. justo
  // después de crear la cuenta), sin pasar por el login mock.
  registrarSesion: (usuario: Usuario) => void;
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
      // Sincroniza qué perfil mock (features/perfil) corresponde a esta
      // sesión: son dos mocks independientes, así que hay que enlazarlos
      // explícitamente por id.
      establecerPerfilActivo(usuarioObtenido.id);
      setUsuario(usuarioObtenido);
    } finally {
      setCargando(false);
    }
  }

  function registrarSesion(nuevoUsuario: Usuario) {
    setUsuario(nuevoUsuario);
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
        registrarSesion,
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