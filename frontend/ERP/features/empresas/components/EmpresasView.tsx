"use client";

import { useState } from "react";
import Link from "next/link";
import { Empresa } from "@/features/empresas/types/empresa";
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";

interface EmpresasViewProps {
  empresas: Empresa[];
  onEliminar: (id: number) => Promise<void>;
}

export function EmpresasView({ empresas, onEliminar }: EmpresasViewProps) {
    const [empresaAEliminar, setEmpresaAEliminar] = useState<Empresa | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [errorPorFila, setErrorPorFila] = useState<Record<number, string>>({});

    const confirmarEliminacion = async () => {
      if (!empresaAEliminar) return;

      setEliminando(true);
      try {
        await onEliminar(empresaAEliminar.id);
        setEmpresaAEliminar(null);
      } catch (err) {
        setErrorPorFila((prev) => ({
          ...prev,
          [empresaAEliminar.id]: err instanceof Error ? err.message : "No se pudo eliminar",
        }));
        setEmpresaAEliminar(null);
      } finally {
        setEliminando(false);
      }
    };

     return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">

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
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Acciones
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
                      className="text-sm font-medium text-primary-600 hover:underline"
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
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => setEmpresaAEliminar(empresa)}
                      title="Eliminar empresa"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7h12Z"
                        />
                      </svg>
                    </button>
                    {errorPorFila[empresa.id] && (
                      <p className="mt-1 max-w-[160px] text-xs text-red-500">
                        {errorPorFila[empresa.id]}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {empresaAEliminar && (
        <ConfirmacionModal
          titulo="Eliminar empresa"
          mensaje={`¿Eliminar la empresa "${empresaAEliminar.razonSocial}"? Esta acción no se puede deshacer.`}
          confirmando={eliminando}
          labelConfirmando="Eliminando…"
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setEmpresaAEliminar(null)}
        />
      )}
    </div>
  );
}
