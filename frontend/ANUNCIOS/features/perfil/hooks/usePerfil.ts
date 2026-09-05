// features/perfil/hooks/usePerfil.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PerfilPostulante,
  DatosPersonalesPerfil,
  FormacionAcademica,
  IdiomaPerfil,
  ExperienciaLaboral,
} from '../types';
import {
  fetchPerfil,
  updateFoto,
  updateDatosPersonales,
  updateResumenProfesional,
  subirCv,
  eliminarCv,
  addFormacion,
  eliminarFormacion,
  addIdioma,
  eliminarIdioma,
  addExperiencia,
  eliminarExperiencia,
} from '../services/perfilService';

interface UsePerfilResult {
  perfil: PerfilPostulante | null;
  loading: boolean;
  error: string | null;
  guardando: boolean;
  actualizarFoto: (archivo: File) => Promise<void>;
  guardarDatosPersonales: (datos: DatosPersonalesPerfil) => Promise<void>;
  guardarResumenProfesional: (resumen: string) => Promise<void>;
  subirCv: (archivo: File) => Promise<void>;
  eliminarCv: () => Promise<void>;
  agregarFormacion: (formacion: Omit<FormacionAcademica, 'id'>) => Promise<void>;
  eliminarFormacion: (id: string) => Promise<void>;
  agregarIdioma: (idioma: Omit<IdiomaPerfil, 'id'>) => Promise<void>;
  eliminarIdioma: (id: string) => Promise<void>;
  agregarExperiencia: (experiencia: Omit<ExperienciaLaboral, 'id'>) => Promise<void>;
  eliminarExperiencia: (id: string) => Promise<void>;
}

export function usePerfil(): UsePerfilResult {
  const [perfil, setPerfil] = useState<PerfilPostulante | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPerfil();
      setPerfil(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizarFoto = async (archivo: File) => {
    setGuardando(true);
    try {
      const url = await updateFoto(archivo);
      setPerfil((prev) => (prev ? { ...prev, fotoUrl: url } : prev));
    } finally {
      setGuardando(false);
    }
  };

  const guardarDatosPersonales = async (datos: DatosPersonalesPerfil) => {
    setGuardando(true);
    try {
      const actualizado = await updateDatosPersonales(datos);
      setPerfil(actualizado);
    } finally {
      setGuardando(false);
    }
  };

  const guardarResumenProfesional = async (resumen: string) => {
    setGuardando(true);
    try {
      const actualizado = await updateResumenProfesional(resumen);
      setPerfil(actualizado);
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirCv = async (archivo: File) => {
    const nuevoCv = await subirCv(archivo);
    setPerfil((prev) => (prev ? { ...prev, cv: nuevoCv } : prev));
  };

  const handleEliminarCv = async () => {
    await eliminarCv();
    setPerfil((prev) => (prev ? { ...prev, cv: undefined } : prev));
  };

  const agregarFormacion = async (formacion: Omit<FormacionAcademica, 'id'>) => {
    setGuardando(true);
    try {
      const nueva = await addFormacion(formacion);
      setPerfil((prev) =>
        prev ? { ...prev, formacionAcademica: [...prev.formacionAcademica, nueva] } : prev
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarFormacion = async (id: string) => {
    await eliminarFormacion(id);
    setPerfil((prev) =>
      prev
        ? { ...prev, formacionAcademica: prev.formacionAcademica.filter((f) => f.id !== id) }
        : prev
    );
  };

  const agregarIdioma = async (idioma: Omit<IdiomaPerfil, 'id'>) => {
    setGuardando(true);
    try {
      const nuevo = await addIdioma(idioma);
      setPerfil((prev) => (prev ? { ...prev, idiomas: [...prev.idiomas, nuevo] } : prev));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarIdioma = async (id: string) => {
    await eliminarIdioma(id);
    setPerfil((prev) => (prev ? { ...prev, idiomas: prev.idiomas.filter((i) => i.id !== id) } : prev));
  };

  const agregarExperiencia = async (experiencia: Omit<ExperienciaLaboral, 'id'>) => {
    setGuardando(true);
    try {
      const nueva = await addExperiencia(experiencia);
      setPerfil((prev) => (prev ? { ...prev, experiencia: [...prev.experiencia, nueva] } : prev));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarExperiencia = async (id: string) => {
    await eliminarExperiencia(id);
    setPerfil((prev) =>
      prev ? { ...prev, experiencia: prev.experiencia.filter((e) => e.id !== id) } : prev
    );
  };

  return {
    perfil,
    loading,
    error,
    guardando,
    actualizarFoto,
    guardarDatosPersonales,
    guardarResumenProfesional,
    subirCv: handleSubirCv,
    eliminarCv: handleEliminarCv,
    agregarFormacion,
    eliminarFormacion: handleEliminarFormacion,
    agregarIdioma,
    eliminarIdioma: handleEliminarIdioma,
    agregarExperiencia,
    eliminarExperiencia: handleEliminarExperiencia,
  };
}
