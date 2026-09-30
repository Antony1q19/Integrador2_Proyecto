// features/entrevistas/components/EntrevistaModal.tsx
//
// Ventana para PROGRAMAR una entrevista (o reprogramar una existente). Desde la ficha del postulante el postulante
// ya viene fijo (`postulanteIdFijo`); desde la Agenda de entrevistas se elige. Solo se ofrecen las postulaciones que
// siguen abiertas (ni descartadas ni ya contratadas).
"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BotonesModal, Campo, ESTILO_CAMPO, Modal } from "@/components/shared/Modal";
import { useReferenciasSeleccion } from "@/features/postulantes/hooks/useReferenciasSeleccion";
import { aInputDeFechaHora } from "@/lib/fechasLima";
import { actualizarEntrevista, programarEntrevista } from "../services/entrevistasService";
import { Entrevista, MODALIDADES_ENTREVISTA, ModalidadEntrevista } from "../types/entrevista.types";

interface EntrevistaModalProps {
  entrevista?: Entrevista; // si viene, se está REPROGRAMANDO / editando
  postulanteIdFijo?: string;
  onCerrar: () => void;
  onGuardada: (entrevista: Entrevista) => void;
}

const DURACIONES = [15, 30, 45, 60, 90, 120];

export function EntrevistaModal({ entrevista, postulanteIdFijo, onCerrar, onGuardada }: EntrevistaModalProps) {
  const { postulantes, anuncios, cargando } = useReferenciasSeleccion();
  const esEdicion = entrevista !== undefined;

  const [postulanteId, setPostulanteId] = useState(entrevista?.postulanteId ?? postulanteIdFijo ?? "");
  const [anuncioId, setAnuncioId] = useState<number | "">(entrevista?.anuncioId ?? "");
  const [fechaHora, setFechaHora] = useState(entrevista ? aInputDeFechaHora(entrevista.fechaHora) : "");
  const [duracionMin, setDuracionMin] = useState(entrevista?.duracionMin ?? 30);
  const [modalidad, setModalidad] = useState<ModalidadEntrevista>(entrevista?.modalidad ?? "Virtual");
  const [lugarOEnlace, setLugarOEnlace] = useState(entrevista?.lugarOEnlace ?? "");
  const [entrevistador, setEntrevistador] = useState(entrevista?.entrevistador ?? "");
  const [notas, setNotas] = useState(entrevista?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Postulantes con al menos una postulación abierta.
  const postulantesDisponibles = useMemo(
    () =>
      postulantes
        .filter((p) => Object.values(p.procesosPostulacion).some((pr) => pr.estadoActual !== "DESCARTADO" && pr.estadoActual !== "CONTRATADO"))
        .sort((a, b) => a.datosPersonales.apellidos.localeCompare(b.datosPersonales.apellidos)),
    [postulantes]
  );

  // Vacantes (anuncios) abiertas de ESE postulante.
  const vacantesDelPostulante = useMemo(() => {
    const postulante = postulantes.find((p) => p.id === postulanteId);
    if (!postulante) return [];
    return anuncios.filter((a) => {
      const proceso = postulante.procesosPostulacion[String(a.id)];
      return proceso && proceso.estadoActual !== "DESCARTADO" && proceso.estadoActual !== "CONTRATADO";
    });
  }, [postulantes, anuncios, postulanteId]);

  // Si solo tiene una vacante abierta, se elige sola.
  const anuncioElegido = anuncioId !== "" ? anuncioId : vacantesDelPostulante.length === 1 ? vacantesDelPostulante[0].id : "";

  const ahoraLocal = aInputDeFechaHora(new Date().toISOString());
  const enElPasado = fechaHora !== "" && fechaHora < ahoraLocal;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!postulanteId || anuncioElegido === "" || !fechaHora) {
      setError("Elige el postulante, la vacante y la fecha y hora.");
      return;
    }
    setGuardando(true);
    try {
      const guardada = esEdicion
        ? await actualizarEntrevista(entrevista, {
            fechaHora,
            duracionMin,
            modalidad,
            lugarOEnlace: lugarOEnlace.trim(),
            entrevistador: entrevistador.trim() || undefined,
            notas: notas.trim(),
          })
        : await programarEntrevista({
            postulanteId,
            anuncioId: Number(anuncioElegido),
            fechaHora,
            duracionMin,
            modalidad,
            lugarOEnlace: lugarOEnlace.trim() || undefined,
            entrevistador: entrevistador.trim() || undefined,
            notas: notas.trim() || undefined,
          });
      onGuardada(guardada);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la entrevista");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={esEdicion ? "Reprogramar entrevista" : "Programar entrevista"} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={enviar} className="space-y-4">
        {!postulanteIdFijo && !esEdicion && (
          <Campo etiqueta="Postulante" obligatorio>
            <select
              value={postulanteId}
              onChange={(e) => {
                setPostulanteId(e.target.value);
                setAnuncioId("");
              }}
              disabled={cargando}
              className={ESTILO_CAMPO}
            >
              <option value="">{cargando ? "Cargando…" : "Selecciona un postulante"}</option>
              {postulantesDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.datosPersonales.apellidos}, {p.datosPersonales.nombres}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Vacante" obligatorio ayuda={vacantesDelPostulante.length === 0 && postulanteId ? "Este postulante no tiene postulaciones abiertas." : undefined}>
          <select
            value={anuncioElegido}
            onChange={(e) => setAnuncioId(Number(e.target.value))}
            disabled={esEdicion || !postulanteId || vacantesDelPostulante.length === 0}
            className={ESTILO_CAMPO}
          >
            <option value="">Selecciona la vacante</option>
            {(esEdicion ? anuncios.filter((a) => a.id === entrevista.anuncioId) : vacantesDelPostulante).map((a) => (
              <option key={a.id} value={a.id}>
                {a.cargo} · {a.empresaRazonSocial}
              </option>
            ))}
          </select>
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Fecha y hora (hora de Perú)" obligatorio>
            <input type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} className={ESTILO_CAMPO} />
          </Campo>
          <Campo etiqueta="Duración">
            <select value={duracionMin} onChange={(e) => setDuracionMin(Number(e.target.value))} className={ESTILO_CAMPO}>
              {DURACIONES.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {enElPasado && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={14} /> La fecha elegida ya pasó. Puedes guardarla igual si estás registrando una entrevista anterior.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Modalidad" obligatorio>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadEntrevista)} className={ESTILO_CAMPO}>
              {MODALIDADES_ENTREVISTA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Entrevistador" ayuda="Si lo dejas vacío, eres tú.">
            <input value={entrevistador} onChange={(e) => setEntrevistador(e.target.value)} placeholder="Nombre" className={ESTILO_CAMPO} />
          </Campo>
        </div>

        <Campo
          etiqueta={modalidad === "Virtual" ? "Enlace de la videollamada" : modalidad === "Presencial" ? "Dirección" : "Teléfono"}
        >
          <input
            value={lugarOEnlace}
            onChange={(e) => setLugarOEnlace(e.target.value)}
            placeholder={modalidad === "Virtual" ? "https://meet.google.com/…" : modalidad === "Presencial" ? "Av. … / oficina" : "+51 …"}
            className={ESTILO_CAMPO}
          />
        </Campo>

        <Campo etiqueta="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Temas a tratar, indicaciones para el postulante…" className={ESTILO_CAMPO} />
        </Campo>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <BotonesModal guardando={guardando} textoGuardar={esEdicion ? "Guardar cambios" : "Programar"} onCancelar={onCerrar} />
      </form>
    </Modal>
  );
}
