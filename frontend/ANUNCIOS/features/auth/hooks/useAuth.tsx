// features/auth/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DatosRegistroPostulante, Usuario } from '../types';
import {
  iniciarSesion as iniciarSesionService,
  registrarCuenta as registrarCuentaService,
  cerrarSesion as cerrarSesionService,
  obtenerSesionActual as obtenerSesionActualService,
  aceptarTerminosVigentes as aceptarTerminosService,
} from '@/features/auth/services/authService';

interface AuthContextValue {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<Usuario>;
  registrar: (datos: DatosRegistroPostulante) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  aceptarTerminos: (version?: string) => Promise<void>;
  recargarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargarSesion = useCallback(async () => {
    try {
      const sesion = await obtenerSesionActualService();
      setUsuario(sesion);
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargarSesion();
  }, [recargarSesion]);

  async function iniciarSesion(email: string, password: string): Promise<Usuario> {
    setCargando(true);
    try {
      const usuarioObtenido = await iniciarSesionService(email, password);
      setUsuario(usuarioObtenido);
      return usuarioObtenido;
    } finally {
      setCargando(false);
    }
  }

  async function registrar(datos: DatosRegistroPostulante): Promise<Usuario> {
    setCargando(true);
    try {
      const usuarioObtenido = await registrarCuentaService(datos);
      setUsuario(usuarioObtenido);
      return usuarioObtenido;
    } finally {
      setCargando(false);
    }
  }

  async function cerrarSesion(): Promise<void> {
    setCargando(true);
    try {
      await cerrarSesionService();
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }

  async function aceptarTerminos(version = '2026-01'): Promise<void> {
    await aceptarTerminosService(version);
    setUsuario((prev) => (prev ? { ...prev, requiereAceptarTerminos: false, versionTerminos: version } : null));
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaAutenticado: usuario !== null,
        cargando,
        iniciarSesion,
        registrar,
        cerrarSesion,
        aceptarTerminos,
        recargarSesion,
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