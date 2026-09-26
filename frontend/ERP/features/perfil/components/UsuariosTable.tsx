// features/perfil/components/UsuariosTable.tsx
"use client";

import { useEffect, useState } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { Empresa } from "@/features/empresas/types/empresa";
import { fetchEmpresas } from "@/features/empresas/services/empresasApi";
import { EstadoUsuario, Usuario } from "../types/usuario";
import { Skeleton } from "@/components/shared/Skeleton";

const ESTILOS_ROL: Record<Usuario["rol"], string> = {
  Admin: "bg-violet-100 text-violet-700",
  RRHH: "bg-blue-100 text-blue-700",
  Supervisor: "bg-amber-100 text-amber-700",
};

const ESTILOS_ESTADO: Record<EstadoUsuario, string> = {
  Activo: "text-emerald-600",
  Suspendido: "text-amber-600",
  Eliminado: "text-red-500",
};

// Nombres de las empresas asignadas (los ids que ya no existen en la base de datos se muestran como "#id").
function nombresEmpresas(ids: number[], empresas: Empresa[]): string {
  if (ids.length === 0) return "—";
  return ids.map((id) => empresas.find((e) => e.id === id)?.razonSocial ?? `#${id}`).join(", ");
}

interface UsuariosTableProps {
  usuarios: Usuario[];
  miEmail: string;
  cargando: boolean;
  onEditar: (usuario: Usuario) => void;
  onRestablecerPassword: (usuario: Usuario) => void;
  onCambiarEstado: (usuario: Usuario, estado: EstadoUsuario) => void;
}

export function UsuariosTable({
  usuarios,
  miEmail,
  cargando,
  onEditar,
  onRestablecerPassword,
  onCambiarEstado,
}: UsuariosTableProps) {
  // Las empresas se leen de la base de datos (solo para mostrar sus nombres).
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  useEffect(() => {
    let cancelado = false;
    fetchEmpresas()
      .then((lista) => {
        if (!cancelado) setEmpresas(lista);
      })
      .catch(() => {
        // Si falla, se muestran los ids (#1, #2...) en vez de los nombres.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <div aria-hidden className="space-y-3 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="ml-auto h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (usuarios.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-400">No hay trabajadores registrados.</p>;
  }

  return (
    <div className="overflow-x-auto p-6">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
            <th className="pb-3 font-semibold">Usuario</th>
            <th className="pb-3 font-semibold">Correo</th>
            <th className="pb-3 font-semibold">Rol</th>
            <th className="pb-3 font-semibold">Empresas</th>
            <th className="pb-3 font-semibold">Estado</th>
            <th className="pb-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {usuarios.map((usuario) => {
            const esUnoMismo = usuario.email === miEmail;
            return (
              <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 font-medium text-sm text-slate-800">
                  {usuario.nombre}
                  {esUnoMismo && <span className="ml-2 text-[10px] text-slate-400">(tú)</span>}
                </td>
                <td className="py-4 text-sm text-slate-500">{usuario.email}</td>
                <td className="py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTILOS_ROL[usuario.rol]}`}>
                    {usuario.rol}
                  </span>
                </td>
                <td className="py-4 text-xs text-slate-500 max-w-[220px]">
                  {usuario.rol === "Admin" ? "Todas" : nombresEmpresas(usuario.empresasVisibles, empresas)}
                </td>
                <td className="py-4">
                  <select
                    value={usuario.estado}
                    disabled={esUnoMismo}
                    onChange={(e) => onCambiarEstado(usuario, e.target.value as EstadoUsuario)}
                    title={esUnoMismo ? "No puedes cambiar el estado de tu propia cuenta" : undefined}
                    className={`text-sm font-medium bg-transparent border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${ESTILOS_ESTADO[usuario.estado]}`}
                  >
                    <option value="Activo">● Activo</option>
                    <option value="Suspendido">● Suspendido</option>
                    <option value="Eliminado">● Eliminado</option>
                  </select>
                </td>
                <td className="py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(usuario)}
                      title="Editar datos"
                      className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestablecerPassword(usuario)}
                      title="Restablecer contraseña a 123456"
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <KeyRound size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
