// features/perfil/components/CambiarPasswordCard.tsx
//
// Cualquier usuario autenticado puede cambiar su propia contraseña acá
// (PATCH /api/usuarios/me/password -> Gateway, sin necesitar rol Admin).
"use client";

import { useState } from "react";
import { Key } from "lucide-react";
import { cambiarMiPassword } from "../services/usuariosService";
import { vaciarCache } from "@/lib/cacheCliente";

export function CambiarPasswordCard() {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (passwordNuevo !== passwordConfirmar) {
      setMensaje({ texto: "La confirmación no coincide con la nueva contraseña", esError: true });
      return;
    }
    // Misma política que valida el backend (que además rechaza claves comunes o iguales al correo).
    if (passwordNuevo.length < 8 || !/[A-Z]/.test(passwordNuevo) || !/[a-z]/.test(passwordNuevo) || !/[0-9]/.test(passwordNuevo)) {
      setMensaje({
        texto: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
        esError: true,
      });
      return;
    }

    setGuardando(true);
    try {
      const sesionCerrada = await cambiarMiPassword(passwordActual, passwordNuevo);
      if (sesionCerrada) {
        // Al cambiar la contraseña el servidor cierra la sesión (los tokens anteriores dejan de valer).
        // Se limpian las cookies de pantalla y se vuelve al login para entrar con la contraseña nueva.
        setMensaje({ texto: "Contraseña actualizada. Inicia sesión nuevamente con tu nueva contraseña…", esError: false });
        for (const nombre of ["userRole", "userName", "userEmail", "userEmpresas"]) {
          document.cookie = `${nombre}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
        vaciarCache();
        setTimeout(() => {
          // Recarga completa a propósito (igual que sesionVencida en lib/apiCliente.ts): descarta todo el estado en memoria.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        }, 2000);
        return;
      }
      setMensaje({ texto: "Contraseña actualizada correctamente", esError: false });
      setPasswordActual("");
      setPasswordNuevo("");
      setPasswordConfirmar("");
    } catch (err) {
      setMensaje({ texto: err instanceof Error ? err.message : "No se pudo actualizar", esError: true });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Key className="text-primary-500" size={20} /> Seguridad
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña Actual</label>
          <input
            type="password"
            required
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nueva Contraseña</label>
          <input
            type="password"
            required
            minLength={8}
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
          <input
            type="password"
            required
            minLength={8}
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-primary-500"
          />
        </div>

        {mensaje && (
          <p className={`text-xs font-medium ${mensaje.esError ? "text-red-600" : "text-emerald-600"}`}>
            {mensaje.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full mt-2 py-3 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-60"
        >
          {guardando ? "Actualizando..." : "Actualizar Contraseña"}
        </button>
      </form>
    </div>
  );
}
