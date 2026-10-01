// features/postulantes/components/SolicitarCuentaBoton.tsx
//
// Botón "Solicitar" de la columna "Cuenta" en /postulantes: el backend le envía al postulante un
// correo (Mailjet) invitándolo a crear su cuenta en ANUNCIOS. Muestra el resultado en el mismo botón.
"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { solicitarCuenta } from "../services/postulantesService";

type Estado = { tipo: "inicial" } | { tipo: "enviando" } | { tipo: "enviado" } | { tipo: "error"; mensaje: string };

export function SolicitarCuentaBoton({ postulanteId, email }: { postulanteId: string; email: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });

  const enviar = async () => {
    setEstado({ tipo: "enviando" });
    try {
      await solicitarCuenta(postulanteId);
      setEstado({ tipo: "enviado" });
    } catch (e) {
      setEstado({ tipo: "error", mensaje: e instanceof Error ? e.message : "No se pudo enviar la invitación" });
    }
  };

  if (estado.tipo === "enviado") {
    return (
      <span
        role="status"
        title={`Invitación enviada a ${email}`}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
      >
        <Check className="h-3.5 w-3.5" /> Enviado
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => void enviar()}
        disabled={estado.tipo === "enviando"}
        title={`Enviar un correo a ${email} para que cree su cuenta`}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
      >
        {estado.tipo === "enviando" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Mail className="h-3.5 w-3.5" /> {estado.tipo === "error" ? "Reintentar" : "Solicitar"}
          </>
        )}
      </button>
      {estado.tipo === "error" && (
        <p role="alert" className="max-w-[12rem] text-[11px] leading-tight text-red-600">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
