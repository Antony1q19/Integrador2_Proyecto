// features/comunicaciones/components/NuevaPlantillaModal.tsx
// Formulario para crear una plantilla de WhatsApp y mandarla a revisión de Meta.
"use client";

import { useRef, useState } from "react";
import { Modal, Campo, ESTILO_CAMPO } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { crearPlantillaWhatsApp } from "../services/plantillasService";
import {
  CategoriaPlantilla,
  IDIOMAS_PLANTILLA,
  PlantillaWhatsApp,
  contarVariables,
  rellenarPlantilla,
} from "../types/plantillasWhatsApp.types";

interface Props {
  onCerrar: () => void;
  onCreada: (plantilla: PlantillaWhatsApp) => void;
}

// Meta solo acepta minúsculas, números y guion bajo en el nombre.
const aNombreValido = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_");

export function NuevaPlantillaModal({ onCerrar, onCreada }: Props) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPlantilla>("UTILITY");
  const [idioma, setIdioma] = useState("es");
  const [cuerpo, setCuerpo] = useState("");
  const [ejemplos, setEjemplos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cuerpoRef = useRef<HTMLTextAreaElement>(null);

  const totalVariables = contarVariables(cuerpo);

  const agregarVariable = () => {
    const marca = `{{${totalVariables + 1}}}`;
    const area = cuerpoRef.current;
    const inicio = area?.selectionStart ?? cuerpo.length;
    const fin = area?.selectionEnd ?? cuerpo.length;
    setCuerpo(cuerpo.slice(0, inicio) + marca + cuerpo.slice(fin));
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(inicio + marca.length, inicio + marca.length);
    });
  };

  const cambiarEjemplo = (indice: number, valor: string) => {
    const nuevos = [...ejemplos];
    nuevos[indice] = valor;
    setEjemplos(nuevos);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreFinal = nombre.replace(/^_+|_+$/g, "");
    const ejemplosFinales = Array.from({ length: totalVariables }, (_, i) => (ejemplos[i] ?? "").trim());
    if (!nombreFinal) return setError("Escribe un nombre para la plantilla");
    if (!cuerpo.trim()) return setError("Escribe el texto del mensaje");
    if (ejemplosFinales.some((ej) => !ej)) return setError("Completa un ejemplo para cada variable");

    setGuardando(true);
    setError(null);
    try {
      onCreada(
        await crearPlantillaWhatsApp({ nombre: nombreFinal, categoria, idioma, cuerpo, ejemplos: ejemplosFinales })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la plantilla");
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo="Nueva plantilla de WhatsApp"
      subtitulo="Meta la revisa antes de poder usarla (suele tardar unos minutos)"
      onCerrar={onCerrar}
      bloqueado={guardando}
      ancho="lg"
    >
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Campo etiqueta="Nombre" obligatorio ayuda="Solo minúsculas, números y guion bajo. Ej: confirmacion_entrevista">
              <input
                value={nombre}
                onChange={(e) => setNombre(aNombreValido(e.target.value))}
                maxLength={100}
                placeholder="confirmacion_entrevista"
                className={ESTILO_CAMPO}
              />
            </Campo>
          </div>
          <Campo etiqueta="Categoría" obligatorio>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPlantilla)} className={ESTILO_CAMPO}>
              <option value="UTILITY">Servicio (entrevistas, avisos)</option>
              <option value="MARKETING">Marketing (ofertas de empleo)</option>
            </select>
          </Campo>
          <Campo etiqueta="Idioma" obligatorio>
            <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className={ESTILO_CAMPO}>
              {IDIOMAS_PLANTILLA.map((i) => (
                <option key={i.codigo} value={i.codigo}>{i.nombre}</option>
              ))}
            </select>
          </Campo>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Mensaje <span className="text-red-500">*</span>
            </span>
            <button type="button" onClick={agregarVariable} className="text-xs font-medium text-primary-600 hover:text-primary-700">
              + Agregar variable {`{{${totalVariables + 1}}}`}
            </button>
          </div>
          <textarea
            ref={cuerpoRef}
            value={cuerpo}
            onChange={(e) => setCuerpo(e.target.value)}
            rows={5}
            maxLength={1024}
            placeholder="Hola {{1}}, te confirmamos tu entrevista para el puesto de {{2}} el día {{3}}."
            className={ESTILO_CAMPO}
          />
          <p className="mt-1 text-xs text-slate-400">
            Las variables ({"{{1}}"}, {"{{2}}"}...) se completan al enviar: nombre, puesto, fecha...
          </p>
        </div>

        {totalVariables > 0 && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">Ejemplos (Meta los pide para revisar la plantilla)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: totalVariables }, (_, i) => (
                <input
                  key={i}
                  value={ejemplos[i] ?? ""}
                  onChange={(e) => cambiarEjemplo(i, e.target.value)}
                  placeholder={`Ejemplo de {{${i + 1}}}`}
                  className={ESTILO_CAMPO}
                />
              ))}
            </div>
          </div>
        )}

        {cuerpo.trim() && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-600">Vista previa</p>
            <div className="rounded-lg bg-[#e5ddd5] p-3">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-[#dcf8c6] px-3 py-2 text-sm text-slate-800 shadow-sm">
                {rellenarPlantilla(cuerpo, ejemplos)}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button type="submit" cargando={guardando} textoCargando="Enviando a Meta…">Enviar a revisión</Button>
        </div>
      </form>
    </Modal>
  );
}
