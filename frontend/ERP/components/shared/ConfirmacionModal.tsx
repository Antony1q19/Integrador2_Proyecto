"use client";

// Modal de "¿Estás seguro?" del ERP. Usarlo SIEMPRE en vez de window.confirm (la ventana gris
// del navegador), así las confirmaciones se ven como el resto del sistema.
//
//   <ConfirmacionModal
//     titulo="¿Cancelar esta entrevista?"
//     mensaje="El postulante dejará de verla en su agenda."
//     labelConfirmar="Cancelar entrevista"
//     variante="peligro"             // botón rojo (por defecto); "primario" = índigo
//     confirmando={guardando}        // deshabilita los botones mientras se guarda
//     onConfirmar={...} onCancelar={...}
//   />
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface ConfirmacionModalProps {
  titulo: string;
  mensaje: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  /** Texto del botón mientras `confirmando` es true. */
  labelConfirmando?: string;
  variante?: "peligro" | "primario";
  confirmando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const sinSuscripcion = () => () => {};

export default function ConfirmacionModal({
  titulo,
  mensaje,
  labelConfirmar = "Eliminar",
  labelCancelar = "Cancelar",
  labelConfirmando = "Procesando…",
  variante = "peligro",
  confirmando = false,
  onConfirmar,
  onCancelar,
}: ConfirmacionModalProps) {
  // ¿Ya estamos en el navegador? (createPortal necesita document.body). Mismo patrón que
  // app/(dashboard)/layout.tsx: sin useEffect + setState.
  const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  useEffect(() => {
    function manejarEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !confirmando) onCancelar();
    }
    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [onCancelar, confirmando]);

  if (!montado) return null;

  const contenido = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => !confirmando && onCancelar()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        aria-describedby="confirmacion-mensaje"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirmacion-titulo" className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <p id="confirmacion-mensaje" className="mt-2 text-sm text-slate-600">{mensaje}</p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variante="secundario" onClick={onCancelar} disabled={confirmando}>
            {labelCancelar}
          </Button>
          <Button
            variante={variante}
            onClick={onConfirmar}
            cargando={confirmando}
            textoCargando={labelConfirmando}
            autoFocus
          >
            {labelConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}
