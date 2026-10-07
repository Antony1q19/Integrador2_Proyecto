// features/perfil/components/PasswordTemporalModal.tsx
//
// Muestra UNA sola vez la contraseña temporal (aleatoria) que el backend generó al crear un
// trabajador o al restablecer su clave. En la base de datos solo queda su hash, así que si el
// Admin cierra esta ventana sin copiarla, tendrá que restablecerla otra vez.
// (Antes la clave era siempre "123456" y bastaba un toast; ahora no se puede adivinar.)
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button";

interface PasswordTemporalModalProps {
  titulo: string;
  nombreTrabajador: string;
  password: string;
  onCerrar: () => void;
}

const sinSuscripcion = () => () => {};

export function PasswordTemporalModal({ titulo, nombreTrabajador, password, onCerrar }: PasswordTemporalModalProps) {
  const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const [copiada, setCopiada] = useState(false);

  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [onCerrar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  };

  if (!montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="password-temporal-titulo"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="password-temporal-titulo" className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Contraseña temporal de <strong>{nombreTrabajador}</strong>. Compártela por un medio seguro: solo se
          muestra esta vez. El trabajador debe cambiarla desde &quot;Mi perfil&quot; al ingresar.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 select-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-base tracking-wider text-slate-900">
            {password}
          </code>
          <Button variante="secundario" onClick={() => void copiar()}>
            {copiada ? "Copiada" : "Copiar"}
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variante="primario" onClick={onCerrar} autoFocus>
            Listo
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
