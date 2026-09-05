// app/postulantes/nuevo/page.tsx
import { PostulanteForm } from "@/features/postulantes/components/PostulanteForm";

export default function NuevoPostulantePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Nuevo Postulante
          </h1>
          <p className="text-sm text-slate-500">
            Completa los datos del nuevo candidato
          </p>
        </div>

        {/* Formulario */}
        <PostulanteForm />
      </div>
    </div>
  );
}