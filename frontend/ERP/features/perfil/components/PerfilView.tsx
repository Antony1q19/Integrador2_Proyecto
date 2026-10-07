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
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";
import { PasswordTemporalModal } from "./PasswordTemporalModal";
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
  // Restablecer la contraseña pide confirmación antes (ver ConfirmacionModal al final).
  const [usuarioARestablecer, setUsuarioARestablecer] = useState<Usuario | null>(null);
  const [restableciendo, setRestableciendo] = useState(false);
  // Contraseña temporal recién generada: se muestra una sola vez en su propia ventana.
  const [passwordGenerada, setPasswordGenerada] = useState<{ titulo: string; nombre: string; password: string } | null>(null);
  const { toasts, mostrarToast } = useToast();

  // Lectura síncrona de cookies (sin useEffect+setState) para no disparar
  // el render en cascada que marca react-hooks/set-state-in-effect.
  const userName = decodeURIComponent(useCookieValue("userName")) || "Usuario";
  const userRole = useCookieValue("userRole");
  const userEmail = decodeURIComponent(useCookieValue("userEmail"));
  const misDatos = { name: userName, role: userRole, email: userEmail };

  // Entró con una contraseña temporal (cookie que pone app/api/auth/login): hasta cambiarla, el
  // Gateway solo le permite eso, así que se oculta la gestión de trabajadores.
  const cambioPendiente = useCookieValue("cambioPassword") === "1";
  const esAdmin = misDatos.role === "Admin" && !cambioPendiente;

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

  const handleGuardado = (creado?: { nombre: string; passwordTemporal: string }) => {
    setModalUsuario({ abierto: false, usuario: null });
    if (creado) {
      setPasswordGenerada({ titulo: "Trabajador creado", nombre: creado.nombre, password: creado.passwordTemporal });
    } else {
      mostrarToast("Trabajador actualizado", "success");
    }
    cargarUsuarios();
  };

  const handleRestablecerPassword = (usuario: Usuario) => setUsuarioARestablecer(usuario);

  const confirmarRestablecerPassword = async () => {
    if (!usuarioARestablecer) return;
    setRestableciendo(true);
    try {
      const actualizado = await restablecerPassword(usuarioARestablecer.id);
      setPasswordGenerada({
        titulo: "Contraseña restablecida",
        nombre: usuarioARestablecer.nombre,
        password: actualizado.passwordTemporal,
      });
      setUsuarioARestablecer(null);
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo restablecer", "error");
    } finally {
      setRestableciendo(false);
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

      {cambioPendiente && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Estás usando una contraseña temporal.</strong> Por seguridad, cámbiala ahora para poder usar el
          resto del sistema. Después tendrás que iniciar sesión otra vez con tu nueva contraseña.
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("mi-perfil")}
          className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "mi-perfil" ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <User size={18} /> Mi Perfil
        </button>
        {esAdmin && (
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "usuarios" ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Users size={18} /> Gestión de Trabajadores
          </button>
        )}
      </div>

      {activeTab === "mi-perfil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="text-primary-500" size={20} /> Datos Personales
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
                <div className="p-3 bg-primary-50 text-primary-700 rounded-lg text-sm font-semibold border border-primary-100 flex items-center gap-2 w-fit">
                  <ShieldCheck size={16} /> {misDatos.role}
                </div>
              </div>
            </div>
          </div>

          <CambiarPasswordCard />
        </div>
      )}

      {esAdmin && activeTab === "usuarios" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
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

      {usuarioARestablecer && (
        <ConfirmacionModal
          titulo="¿Restablecer la contraseña?"
          mensaje={`Se generará una nueva contraseña temporal aleatoria para ${usuarioARestablecer.nombre} y la actual dejará de funcionar.`}
          labelConfirmar="Restablecer"
          labelConfirmando="Restableciendo…"
          variante="primario"
          confirmando={restableciendo}
          onConfirmar={() => void confirmarRestablecerPassword()}
          onCancelar={() => setUsuarioARestablecer(null)}
        />
      )}

      {passwordGenerada && (
        <PasswordTemporalModal
          titulo={passwordGenerada.titulo}
          nombreTrabajador={passwordGenerada.nombre}
          password={passwordGenerada.password}
          onCerrar={() => setPasswordGenerada(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
