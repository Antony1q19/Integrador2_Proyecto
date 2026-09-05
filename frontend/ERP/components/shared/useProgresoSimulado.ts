// components/shared/useProgresoSimulado.ts
//
// Barra de progreso de carga SIMULADA: mientras no hay backend real que
// reporte bytes transferidos, esto anima un porcentaje creciente durante la
// tarea asíncrona (subida/reemplazo de archivo) y la lleva a 100% al
// terminar. Reutilizable en cualquier flujo de carga (Uploader, reemplazo
// de documentos, futuros adjuntos de WhatsApp, etc.).
"use client";

import { useRef, useState } from "react";

const INTERVALO_MS = 150;
const TOPE_MIENTRAS_ESPERA = 90;
const RESET_DELAY_MS = 350;

export function useProgresoSimulado() {
  const [progreso, setProgreso] = useState(0);
  const [activo, setActivo] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ejecutar = async (tarea: () => Promise<void>) => {
    setActivo(true);
    setProgreso(0);
    intervaloRef.current = setInterval(() => {
      setProgreso((p) => (p < TOPE_MIENTRAS_ESPERA ? p + Math.random() * 15 + 5 : p));
    }, INTERVALO_MS);

    try {
      await tarea();
      setProgreso(100);
    } finally {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      setTimeout(() => {
        setActivo(false);
        setProgreso(0);
      }, RESET_DELAY_MS);
    }
  };

  return { progreso: Math.min(Math.round(progreso), 100), activo, ejecutar };
}
