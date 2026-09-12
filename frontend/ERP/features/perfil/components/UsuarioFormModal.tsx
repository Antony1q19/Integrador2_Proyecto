// features/perfil/components/UsuarioFormModal.tsx
//
// Un solo modal para crear y editar trabajadores. En edición, el email no
// se puede tocar (es el identificador de login en el Gateway; cambiarlo
// no está soportado por PATCH /usuarios/{id}).
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { crearUsuario, actualizarUsuario, ROLES_INTERNOS } from "../services/usuariosService";
import { RolInterno, Usuario } from "../types/usuario";

interface UsuarioFormModalProps {
  usuarioExistente: Usuario | null; // null = modo "crear"
  onGuardado: (usuarioCreadoConPasswordTemporal?: string) => void;
  onCerrar: () => void;
}

export function UsuarioFormModal({ usuarioExistente, onGuardado, onCerrar }: UsuarioFormModalProps) {
  const esEdicion = usuarioExistente !== null;
  const [nombre, setNombre] = useState(usuarioExistente?.nombre ?? "");
  const [email, setEmail] = useState(usuarioExistente?.email ?? "");
  const [rol, setRol] = useState<RolInterno>(usuarioExistente?.rol ?? "RRHH");
  const [empresasVisibles, setEmpresasVisibles] = useState<number[]>(usuarioExistente?.empresasVisibles ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const alternarEmpresa = (empresaId: number) => {
    setEmpresasVisibles((prev) =>
      prev.includes(empresaId) ? prev.filter((id) => id !== empresaId) : [...prev, empresaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (esEdicion) {
        await actualizarUsuario(usuarioExistente.id, { nombre, rol, empresasVisibles });
        onGuardado();
      } else {
        const creado = await crearUsuario({ nombre, email, rol, empresasVisibles });
        onGuardado(creado.passwordTemporal);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {esEdicion ? "Editar Trabajador" : "Crear Nuevo Trabajador"}
          </h3>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full p-3 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              disabled={esEdicion}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@test.com"
              className="w-full p-3 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
            {esEdicion && (
              <p className="mt-1 text-[11px] text-slate-400">El correo no se puede cambiar una vez creada la cuenta.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rol en el Sistema</label>
            <select
              required
              value={rol}
              onChange={(e) => setRol(e.target.value as RolInterno)}
              className="w-full p-3 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white"
            >
              {ROLES_INTERNOS.map((r) => (
                <option key={r} value={r}>
                  {r === "Admin" ? "Administrador" : r === "RRHH" ? "Recursos Humanos" : "Supervisor"}
                </option>
              ))}
            </select>
          </div>

          {rol !== "Admin" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Empresas que puede ver
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {empresasMock.map((empresa) => (
                  <label key={empresa.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={empresasVisibles.includes(empresa.id)}
                      onChange={() => alternarEmpresa(empresa.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    {empresa.razonSocial}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Si no marcas ninguna, este trabajador no verá ninguna empresa todavía.
              </p>
            </div>
          )}
          {rol === "Admin" && (
            <p className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg p-3">
              Un Administrador ve todas las empresas automáticamente, no hace falta asignarle ninguna.
            </p>
          )}

          {!esEdicion && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              La contraseña temporal será <strong>123456</strong>. Compártela con el trabajador; puede
              cambiarla luego desde su propio &quot;Mi Perfil&quot;.
            </p>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 shadow-md shadow-violet-200 transition-all disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
