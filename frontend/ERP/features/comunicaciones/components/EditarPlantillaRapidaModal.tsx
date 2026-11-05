// features/comunicaciones/components/EditarPlantillaRapidaModal.tsx
// Editar el título y el texto de una plantilla rápida del chat.
"use client";

import { useState } from "react";
import { Modal, Campo, ESTILO_CAMPO } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { actualizarPlantillaRapida } from "../services/plantillasService";
import { PlantillaMensaje } from "../types/comunicaciones.types";

interface Props {
  plantilla: PlantillaMensaje;
  onCerrar: () => void;
  onGuardada: (plantilla: PlantillaMensaje) => void;
}

export function EditarPlantillaRapidaModal({ plantilla, onCerrar, onGuardada }: Props) {
  const [titulo, setTitulo] = useState(plantilla.nombre);
  const [descripcion, setDescripcion] = useState(plantilla.descripcion);
  const [contenido, setContenido] = useState(plantilla.contenido);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return setError("El título y el mensaje son obligatorios");
    setGuardando(true);
    setError(null);
    try {
      onGuardada(await actualizarPlantillaRapida(plantilla.id, { titulo, descripcion, contenido }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Editar plantilla" subtitulo="Cambia el texto que se inserta en el chat" onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Título" obligatorio>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} className={ESTILO_CAMPO} />
        </Campo>
        <Campo etiqueta="Descripción">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} className={ESTILO_CAMPO} />
        </Campo>
        <Campo
          etiqueta="Mensaje"
          obligatorio
          ayuda="{nombre} se completa solo con el nombre del postulante. Puedes usar otras como {puesto} o {fecha}: quedan marcadas para escribirlas antes de enviar."
        >
          <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={6} maxLength={4000} className={ESTILO_CAMPO} />
        </Campo>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button type="submit" cargando={guardando} textoCargando="Guardando…">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
