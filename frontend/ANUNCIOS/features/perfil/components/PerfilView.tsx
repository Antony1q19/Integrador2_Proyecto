// features/perfil/components/PerfilView.tsx
'use client';

import { usePerfil } from '../hooks/usePerfil';
import { PerfilHeader } from './PerfilHeader';
import { DatosPersonalesSection } from './DatosPersonalesSection';
import { CvSection } from './CvSection';
import { ResumenProfesionalSection } from './ResumenProfesionalSection';
import { FormacionAcademicaSection } from './FormacionAcademicaSection';
import { IdiomasSection } from './IdiomasSection';
import { ExperienciaSection } from './ExperienciaSection';

export function PerfilView() {
  const {
    perfil,
    loading,
    error,
    guardando,
    actualizarFoto,
    guardarDatosPersonales,
    guardarResumenProfesional,
    subirCv,
    eliminarCv,
    agregarFormacion,
    eliminarFormacion,
    agregarIdioma,
    eliminarIdioma,
    agregarExperiencia,
    eliminarExperiencia,
  } = usePerfil();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 p-6">
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-gray-500">{error ?? 'No se pudo cargar tu perfil.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <PerfilHeader perfil={perfil} guardando={guardando} onCambiarFoto={actualizarFoto} />

      <DatosPersonalesSection
        datos={perfil.datosPersonales}
        guardando={guardando}
        onGuardar={guardarDatosPersonales}
      />

      <CvSection cv={perfil.cv} onSubir={subirCv} onEliminar={eliminarCv} />

      <ResumenProfesionalSection
        resumen={perfil.resumenProfesional}
        guardando={guardando}
        onGuardar={guardarResumenProfesional}
      />

      <FormacionAcademicaSection
        formacion={perfil.formacionAcademica}
        guardando={guardando}
        onAgregar={agregarFormacion}
        onEliminar={eliminarFormacion}
      />

      <IdiomasSection
        idiomas={perfil.idiomas}
        guardando={guardando}
        onAgregar={agregarIdioma}
        onEliminar={eliminarIdioma}
      />

      <ExperienciaSection
        experiencia={perfil.experiencia}
        guardando={guardando}
        onAgregar={agregarExperiencia}
        onEliminar={eliminarExperiencia}
      />
    </div>
  );
}
