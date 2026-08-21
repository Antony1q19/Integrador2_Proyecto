import Link from "next/link";
import { Empresa } from "@/features/empresas/types/empresa";

export function EmpresasView({ empresas }: { empresas: Empresa[] }) {
     return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Empresas Clientes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {empresas.length} empresas registradas
            </p>
          </div>
          <Link
            href="/empresas/nueva"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            + Nueva Empresa
          </Link>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Razón Social
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  RUC
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sector
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Anuncios Activos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empresas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/empresas/${empresa.id}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {empresa.razonSocial}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {empresa.ruc}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-800">
                      {empresa.contactoNombre}
                    </div>
                    <div className="text-xs text-slate-500">
                      {empresa.contactoEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {empresa.sector}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800">
                    {empresa.anunciosActivos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
