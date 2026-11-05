// features/comunicaciones/components/RetomarChatModal.tsx
//
// Botón "Retomar chat": envía la plantilla aprobada "Retomar conversación". WhatsApp solo deja
// mandar mensajes normales si el postulante escribió en las últimas 24 horas; pasado ese tiempo, esta
// plantilla es la forma de volver a escribirle. Cuando él responde, el chat queda abierto otras 24 h.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal, Campo, ESTILO_CAMPO } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { enviarPlantillaWhatsApp, fetchPlantillasWhatsApp } from "../services/plantillasService";
import { Contacto, Mensaje } from "../types/comunicaciones.types";
import { ESTADOS_PLANTILLA, PlantillaWhatsApp, rellenarPlantilla } from "../types/plantillasWhatsApp.types";
import { IDIOMA_PLANTILLAS_SISTEMA, buscarPlantillaSistema } from "../plantillasSistema";

const PLANTILLA_RETOMAR = "talenterp_reabrir_conversacion";

interface Props {
  contacto: Contacto;
  onCerrar: () => void;
  onEnviada: (mensaje: Mensaje) => void;
}

export function RetomarChatModal({ contacto, onCerrar, onEnviada }: Props) {
  // undefined = cargando; null = no existe en la cuenta de Meta
  const [plantilla, setPlantilla] = useState<PlantillaWhatsApp | null | undefined>(undefined);
  const [variables, setVariables] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const etiquetas = buscarPlantillaSistema(PLANTILLA_RETOMAR)?.variables ?? [];

  useEffect(() => {
    fetchPlantillasWhatsApp()
      .then((todas) => {
        const encontrada =
          todas.find((p) => p.nombre === PLANTILLA_RETOMAR && p.idioma === IDIOMA_PLANTILLAS_SISTEMA) ?? null;
        setPlantilla(encontrada);
        // El nombre se completa solo; lo demás (el puesto) lo escribe quien envía.
        setVariables(
          Array.from({ length: encontrada?.variables ?? 0 }, (_, i) => (etiquetas[i] === "nombre" ? contacto.nombre : ""))
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la plantilla"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se carga una sola vez al abrir
  }, []);

  const enviar = async () => {
    if (!plantilla) return;
    if (variables.some((v) => !v.trim())) return setError("Completa todos los campos");
    setEnviando(true);
    setError(null);
    try {
      onEnviada(await enviarPlantillaWhatsApp(contacto.id, plantilla, variables.map((v) => v.trim())));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
      setEnviando(false);
    }
  };

  const aprobada = plantilla?.estado === "APPROVED";

  return (
    <Modal
      titulo="Retomar chat"
      subtitulo={`Con ${contacto.nombre} ${contacto.apellido} · +${contacto.telefono}`}
      onCerrar={onCerrar}
      bloqueado={enviando}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Si el postulante no ha escrito en las últimas 24 horas, WhatsApp no entrega mensajes normales. Este
          mensaje sí llega; cuando responda, podrás seguir escribiéndole con normalidad.
        </p>

        {plantilla === undefined && !error && <p className="text-sm text-slate-500">Cargando…</p>}

        {plantilla === null && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            La plantilla &quot;Retomar conversación&quot; no existe en la cuenta de WhatsApp.{" "}
            <Link href="/comunicaciones/plantillas" className="font-medium underline">
              Crear las plantillas del sistema
            </Link>
          </p>
        )}

        {plantilla && !aprobada && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            La plantilla está <strong>{(ESTADOS_PLANTILLA[plantilla.estado]?.texto ?? plantilla.estado).toLowerCase()}</strong>{" "}
            por Meta. Podrás usarla cuando esté aprobada.
          </p>
        )}

        {plantilla && aprobada && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {variables.map((valor, i) => (
                <Campo key={i} etiqueta={etiquetas[i] ? etiquetas[i].charAt(0).toUpperCase() + etiquetas[i].slice(1) : `Variable ${i + 1}`} obligatorio>
                  <input
                    value={valor}
                    onChange={(e) => setVariables(variables.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder={etiquetas[i] === "puesto" ? "Ej. Asistente administrativo" : undefined}
                    className={ESTILO_CAMPO}
                  />
                </Campo>
              ))}
            </div>
            <div className="rounded-lg bg-[#e5ddd5] p-3">
              <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-lg bg-[#dcf8c6] px-3 py-2 text-sm text-slate-800 shadow-sm">
                {rellenarPlantilla(plantilla.cuerpo, variables)}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variante="secundario" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} cargando={enviando} textoCargando="Enviando…" disabled={!aprobada}>
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
