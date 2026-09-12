// features/perfil/components/UsuariosTable.tsx
"use client";

import { KeyRound, Pencil } from "lucide-react";
import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { EstadoUsuario, Usuario } from "../types/usuario";

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

function nombresEmpresas(ids: number[]): string {
  if (ids.length === 0) return "—";
  return ids
    .map((id) => empresasMock.find((e) => e.id === id)?.razonSocial ?? `#${id}`)
    .join(", ");
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
  if (cargando) {
    return <p className="p-6 text-center text-sm text-slate-400">Cargando trabajadores...</p>;
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
                  {usuario.rol === "Admin" ? "Todas" : nombresEmpresas(usuario.empresasVisibles)}
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
