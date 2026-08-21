import Link from "next/link";
import { notFound } from "next/navigation";
import { empresasMock } from "@/features/empresas/data/mock_empresas";

export default async function EmpresasFicha({
    params, 
}: {
    params: Promise<{ id: string }>;
}) {
    const {id} = await params;
    const empresaId = Number(id);
    const empresa = empresasMock.find((e) => e.id === empresaId);

    if (!empresa) {
        notFound();
    }

    return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Navegación de vuelta */}
        <Link
          href="/empresas"
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Volver a Empresas
        </Link>

        {/* Encabezado */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {empresa.razonSocial}
            </h1>
            <p className="mt-1 text-sm text-slate-500">RUC: {empresa.ruc}</p>
          </div>
          <Link
            href={`/empresas/${empresa.id}/editar`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Editar
          </Link>
        </div>

        {/* Tarjeta de información */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Información de Contacto
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Persona de Contacto</dt>
              <dd className="text-sm text-slate-800">
                {empresa.contactoNombre}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Sector</dt>
              <dd className="text-sm text-slate-800">{empresa.sector}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Email</dt>
              <dd className="text-sm text-slate-800">
                {empresa.contactoEmail}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Teléfono</dt>
              <dd className="text-sm text-slate-800">
                {empresa.contactoTelefono}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Fecha de Registro</dt>
              <dd className="text-sm text-slate-800">
                {empresa.fechaRegistro}
              </dd>
            </div>
          </dl>
        </div>

        {/* Anuncios asociados (placeholder por ahora) */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Anuncios Asociados ({empresa.anunciosActivos})
          </h2>
          <p className="text-sm text-slate-400">
            Aquí conectaremos el listado de anuncios cuando construyamos HU-10.
          </p>
        </div>
      </div>
    </div>
  );
}