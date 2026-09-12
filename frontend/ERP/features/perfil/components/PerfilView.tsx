// features/perfil/components/PerfilView.tsx
"use client";

import { useEffect, useState } from "react";
import { User, Users, Plus, Mail, ShieldCheck } from "lucide-react";
import { useToast, ToastContainer } from "@/components/shared/Toast";
import { useCookieValue } from "@/lib/useCookieValue";
import { CambiarPasswordCard } from "./CambiarPasswordCard";
import { UsuariosTable } from "./UsuariosTable";
import { UsuarioFormModal } from "./UsuarioFormModal";
import { ConfirmarEliminacionModal } from "./ConfirmarEliminacionModal";
import {
  listarUsuarios,
  restablecerPassword,
  cambiarEstadoUsuario,
} from "../services/usuariosService";
import { EstadoUsuario, Usuario } from "../types/usuario";

export function PerfilView() {
  const [activeTab, setActiveTab] = useState<"mi-perfil" | "usuarios">("mi-perfil");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [modalUsuario, setModalUsuario] = useState<{ abierto: boolean; usuario: Usuario | null }>({
    abierto: false,
    usuario: null,
  });
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { toasts, mostrarToast } = useToast();

  // Lectura síncrona de cookies (sin useEffect+setState) para no disparar
  // el render en cascada que marca react-hooks/set-state-in-effect.
  const userName = decodeURIComponent(useCookieValue("userName")) || "Usuario";
  const userRole = useCookieValue("userRole");
  const userEmail = decodeURIComponent(useCookieValue("userEmail"));
  const misDatos = { name: userName, role: userRole, email: userEmail };

  const esAdmin = misDatos.role === "Admin";

  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cargar la lista", "error");
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    // Carga inicial al entrar a la pestaña (patrón estándar de
    // fetch-en-efecto, ver usePostulantesPipeline.ts para el mismo caso).
    if (esAdmin && activeTab === "usuarios") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarUsuarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin, activeTab]);

  const handleGuardado = (passwordTemporal?: string) => {
    setModalUsuario({ abierto: false, usuario: null });
    mostrarToast(
      passwordTemporal
        ? `Trabajador creado. Contraseña temporal: ${passwordTemporal}`
        : "Trabajador actualizado",
      "success"
    );
    cargarUsuarios();
  };

  const handleRestablecerPassword = async (usuario: Usuario) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${usuario.nombre} a "123456"?`)) return;
    try {
      const actualizado = await restablecerPassword(usuario.id);
      mostrarToast(`Nueva contraseña temporal de ${usuario.nombre}: ${actualizado.passwordTemporal}`, "success");
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo restablecer", "error");
    }
  };

  const handleCambiarEstado = async (usuario: Usuario, estado: EstadoUsuario) => {
    // "Eliminado" pasa siempre por el modal de confirmación (ver
    // ConfirmarEliminacionModal); Activo/Suspendido se aplican directo.
    if (estado === "Eliminado") {
      setUsuarioAEliminar(usuario);
      return;
    }
    try {
      await cambiarEstadoUsuario(usuario.id, estado);
      mostrarToast(`${usuario.nombre} ahora está "${estado}"`, "success");
      cargarUsuarios();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo cambiar el estado", "error");
    }
  };

  const handleConfirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;
    setEliminando(true);
    try {
      await cambiarEstadoUsuario(usuarioAEliminar.id, "Eliminado");
      mostrarToast(`Se eliminó la cuenta de ${usuarioAEliminar.nombre}`, "success");
      setUsuarioAEliminar(null);
      cargarUsuarios();
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar la cuenta", "error");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Configuración de Cuenta</h1>
        <p className="text-slate-500 mt-1">Gestiona tu información personal y los accesos del equipo.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("mi-perfil")}
          className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "mi-perfil" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <User size={18} /> Mi Perfil
        </button>
        {esAdmin && (
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "usuarios" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Users size={18} /> Gestión de Trabajadores
          </button>
        )}
      </div>

      {activeTab === "mi-perfil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="text-violet-500" size={20} /> Datos Personales
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-200">
                  {misDatos.name}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Correo Electrónico</label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-200 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" /> {misDatos.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rol de Sistema</label>
                <div className="p-3 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold border border-violet-100 flex items-center gap-2 w-fit">
                  <ShieldCheck size={16} /> {misDatos.role}
                </div>
              </div>
            </div>
          </div>

          <CambiarPasswordCard />
        </div>
      )}

      {esAdmin && activeTab === "usuarios" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Trabajadores Registrados</h2>
              <p className="text-xs text-slate-500 mt-1">Administra los accesos de la consultora.</p>
            </div>
            <button
              onClick={() => setModalUsuario({ abierto: true, usuario: null })}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition"
            >
              <Plus size={16} /> Nuevo Trabajador
            </button>
          </div>

          <UsuariosTable
            usuarios={usuarios}
            miEmail={misDatos.email}
            cargando={cargandoUsuarios}
            onEditar={(usuario) => setModalUsuario({ abierto: true, usuario })}
            onRestablecerPassword={handleRestablecerPassword}
            onCambiarEstado={handleCambiarEstado}
          />
        </div>
      )}

      {modalUsuario.abierto && (
        <UsuarioFormModal
          usuarioExistente={modalUsuario.usuario}
          onGuardado={handleGuardado}
          onCerrar={() => setModalUsuario({ abierto: false, usuario: null })}
        />
      )}

      {usuarioAEliminar && (
        <ConfirmarEliminacionModal
          usuario={usuarioAEliminar}
          eliminando={eliminando}
          onConfirmar={handleConfirmarEliminacion}
          onCancelar={() => setUsuarioAEliminar(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
