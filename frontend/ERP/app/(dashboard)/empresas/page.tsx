/*
import { EmpresasView } from "@/features/empresas/components/EmpresasView";
import { mapearEmpresaDeApi } from "@/features/empresas/services/empresasApi";
import { obtenerDelGateway } from "@/lib/datosServidor";

export default async function EmpresasPage() {
  // Las empresas salen de la base de datos, ya filtradas por el backend: un Admin ve todas;
  // RRHH/Supervisor solo las que un Admin les asignó en /perfil -> "Gestión de Trabajadores".
  const dtos = (await obtenerDelGateway<Record<string, unknown>[]>("/empresas")) ?? [];
  return <EmpresasView empresas={dtos.map(mapearEmpresaDeApi)} />;
}
*/

"use client";

import Link from "next/link";
import { usePermisos } from "@/lib/usePermisos";
import { useEmpresas } from "@/features/empresas/hooks/useEmpresas";
import { EmpresasView } from "@/features/empresas/components/EmpresasView";

export default function EmpresasPage() {
  const { empresas, cargando, error, eliminar } = useEmpresas();
  // Crear y eliminar empresas: solo Admin (ver lib/permisos.ts).
  const { puedeCrearEliminarEmpresas } = usePermisos();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Empresas Clientes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {cargando ? "Cargando..." : `${empresas.length} empresas registradas`}
            </p>
          </div>
          {puedeCrearEliminarEmpresas && (
            <Link
              href="/empresas/nueva"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              + Nueva Empresa
            </Link>
          )}
        </div>

        {cargando && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-400">Cargando empresas...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <EmpresasView empresas={empresas} onEliminar={eliminar} puedeEliminar={puedeCrearEliminarEmpresas} />
        )}
      </div>
    </div>
  );
}