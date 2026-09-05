// features/postulantes/components/PostulanteForm/index.tsx
"use client";

import { usePostulanteForm } from "../../hooks/usePostulanteForm";
import { DatosPersonalesSection } from "./DatosPersonalesSection";
import { DatosContactoSection } from "./DatosContactoSection";
import { DatosPostulacionSection } from "./DatosPostulacionSection";
import { SectionNavigation } from "./SectionNavigation";
import { PostulanteSuccessModal } from "../PostulanteSuccessModal";

const SECCIONES = [
  { id: 0, title: "Datos Personales", component: DatosPersonalesSection },
  { id: 1, title: "Datos de Contacto", component: DatosContactoSection },
  { id: 2, title: "Datos de Postulación", component: DatosPostulacionSection },
];

export function PostulanteForm() {
  const {
    formData,
    errors,
    isLoading,
    isSuccess,
    createdPostulanteId,
    currentSection,
    empresasOptions,
    cargosOptions,
    handleChange,
    handleSubmit,
    irASiguienteSeccion,
    irASeccionAnterior,
  } = usePostulanteForm();

  const CurrentSectionComponent = SECCIONES[currentSection].component;

  return (
    <>
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm border border-slate-200 md:p-8">
        {/* Encabezado */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {SECCIONES[currentSection].title}
          </h2>
          <p className="text-sm text-slate-500">
            Sección {currentSection + 1} de {SECCIONES.length}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Sección actual */}
          <CurrentSectionComponent
            formData={formData}
            errors={errors}
            onChange={handleChange}
            empresasOptions={empresasOptions}
            cargosOptions={cargosOptions}
          />

          {/* Error general */}
          {errors.general && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              {errors.general}
            </div>
          )}

          {/* Navegación */}
          <SectionNavigation
            currentSection={currentSection}
            totalSections={SECCIONES.length}
            onPrevious={irASeccionAnterior}
            onNext={irASiguienteSeccion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </form>
      </div>

      {/* Modal de éxito */}
      <PostulanteSuccessModal
        isOpen={isSuccess}
        postulanteId={createdPostulanteId}
      />
    </>
  );
}