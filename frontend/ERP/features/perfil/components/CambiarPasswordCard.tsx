// features/perfil/components/CambiarPasswordCard.tsx
//
// Cualquier usuario autenticado puede cambiar su propia contraseña acá
// (PATCH /api/usuarios/me/password -> Gateway, sin necesitar rol Admin).
"use client";

import { useState } from "react";
import { Key } from "lucide-react";
import { cambiarMiPassword } from "../services/usuariosService";

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
    if (passwordNuevo.length < 6) {
      setMensaje({ texto: "La nueva contraseña debe tener al menos 6 caracteres", esError: true });
      return;
    }

    setGuardando(true);
    try {
      await cambiarMiPassword(passwordActual, passwordNuevo);
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Key className="text-violet-500" size={20} /> Seguridad
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
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nueva Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="••••••••"
            className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-violet-500"
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
          className="w-full mt-2 py-3 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60"
        >
          {guardando ? "Actualizando..." : "Actualizar Contraseña"}
        </button>
      </form>
    </div>
  );
}
