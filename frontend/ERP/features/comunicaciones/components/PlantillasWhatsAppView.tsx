// features/comunicaciones/components/PlantillasWhatsAppView.tsx
// Apartado "Plantillas": las plantillas de WhatsApp de la cuenta de Meta, su estado de revisión,
// y crear / eliminar.
"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";
import { Skeleton } from "@/components/shared/Skeleton";
import { ToastContainer, useToast } from "@/components/shared/Toast";
import { usePermisos } from "@/lib/usePermisos";
import {
  crearPlantillaWhatsApp,
  eliminarPlantillaWhatsApp,
  fetchPlantillasRapidas,
  fetchPlantillasWhatsApp,
} from "../services/plantillasService";
import { PlantillaMensaje } from "../types/comunicaciones.types";
import { EditarPlantillaRapidaModal } from "./EditarPlantillaRapidaModal";
import { IDIOMA_PLANTILLAS_SISTEMA, PLANTILLAS_SISTEMA, buscarPlantillaSistema } from "../plantillasSistema";
import { ESTADOS_PLANTILLA, IDIOMAS_PLANTILLA, PlantillaWhatsApp } from "../types/plantillasWhatsApp.types";
import { NuevaPlantillaModal } from "./NuevaPlantillaModal";

const CATEGORIAS: Record<string, string> = {
  UTILITY: "Servicio",
  MARKETING: "Marketing",
  AUTHENTICATION: "Autenticación",
};

const nombreIdioma = (codigo: string) => IDIOMAS_PLANTILLA.find((i) => i.codigo === codigo)?.nombre ?? codigo;

export function PlantillasWhatsAppView() {
  const { puedeGestionarPlantillasWhatsApp } = usePermisos();
  const { toasts, mostrarToast } = useToast();
  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [aEliminar, setAEliminar] = useState<PlantillaWhatsApp | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [creandoSistema, setCreandoSistema] = useState(false);
  const [rapidas, setRapidas] = useState<PlantillaMensaje[]>([]);
  const [editandoRapida, setEditandoRapida] = useState<PlantillaMensaje | null>(null);

  // Plantillas del catálogo del sistema que todavía no existen en la cuenta de Meta.
  const faltantes = PLANTILLAS_SISTEMA.filter((s) => !plantillas.some((p) => p.nombre === s.nombre));

  const crearPlantillasSistema = async () => {
    setCreandoSistema(true);
    const errores: string[] = [];
    for (const s of faltantes) {
      try {
        await crearPlantillaWhatsApp({
          nombre: s.nombre,
          categoria: "UTILITY",
          idioma: IDIOMA_PLANTILLAS_SISTEMA,
          cuerpo: s.cuerpo,
          ejemplos: s.ejemplos,
        });
      } catch (err) {
        errores.push(`${s.titulo}: ${err instanceof Error ? err.message : "error"}`);
      }
    }
    setCreandoSistema(false);
    if (errores.length) mostrarToast(`No se pudieron crear ${errores.length}: ${errores.join(" · ")}`, "error");
    else mostrarToast("Plantillas del sistema enviadas a revisión de Meta");
    cargar();
  };

  // Pide las plantillas a Meta (a través del backend). El estado "cargando" lo pone quien llama.
  const traer = useCallback(
    () =>
      fetchPlantillasWhatsApp()
        .then(setPlantillas)
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las plantillas"))
        .finally(() => setCargando(false)),
    []
  );

  useEffect(() => {
    fetchPlantillasRapidas().then(setRapidas).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPlantillasWhatsApp()
      .then(setPlantillas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las plantillas"))
      .finally(() => setCargando(false));
  }, []);

  // Botón "Actualizar": sirve para ver si Meta ya aprobó una plantilla en revisión.
  const cargar = () => {
    setCargando(true);
    setError(null);
    traer();
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarPlantillaWhatsApp(aEliminar.nombre);
      setPlantillas((prev) => prev.filter((p) => p.nombre !== aEliminar.nombre));
      mostrarToast(`Plantilla "${aEliminar.nombre}" eliminada`);
      setAEliminar(null);
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : "No se pudo eliminar", "error");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Plantillas de WhatsApp</h1>
          <p className="text-sm text-slate-500">
            Para escribirle a un postulante que no ha respondido en las últimas 24 horas, WhatsApp solo
            permite plantillas aprobadas por Meta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={cargar} disabled={cargando}>
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          {puedeGestionarPlantillasWhatsApp && (
            <Button onClick={() => setCreando(true)}>
              <Plus className="h-4 w-4" /> Nueva plantilla
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!cargando && !error && faltantes.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-primary-800">
            <p className="font-semibold">Faltan {faltantes.length} plantillas del sistema</p>
            <p className="text-primary-700">
              Mensajes listos para cada etapa: {faltantes.map((f) => f.titulo).join(", ")}.
            </p>
          </div>
          {puedeGestionarPlantillasWhatsApp && (
            <Button onClick={crearPlantillasSistema} cargando={creandoSistema} textoCargando="Creando…" className="shrink-0">
              <Sparkles className="h-4 w-4" /> Crear plantillas del sistema
            </Button>
          )}
        </div>
      )}

      {rapidas.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Plantillas rápidas del chat</h2>
            <p className="text-xs text-slate-500">
              Las del botón &quot;Plantillas&quot; junto al cuadro de texto. Se envían como mensaje normal (solo llegan si
              el postulante escribió en las últimas 24 horas).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {rapidas.map((r) => (
              <div key={r.id} className="flex flex-col rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{r.nombre}</p>
                  {puedeGestionarPlantillasWhatsApp && (
                    <button
                      onClick={() => setEditandoRapida(r)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-primary-600"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  )}
                </div>
                <p className="flex-1 whitespace-pre-wrap text-xs text-slate-600">{r.contenido}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-sm font-semibold text-slate-800">Plantillas de WhatsApp (aprobadas por Meta)</h2>

      {cargando && plantillas.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : plantillas.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Aún no hay plantillas en la cuenta de WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plantillas.map((p) => {
            const estado = ESTADOS_PLANTILLA[p.estado] ?? { texto: p.estado, clase: "bg-slate-100 text-slate-600" };
            return (
              <div key={`${p.nombre}-${p.idioma}`} className="flex flex-col rounded-xl border border-slate-100 bg-white p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {buscarPlantillaSistema(p.nombre) && (
                      <p className="text-sm font-semibold text-slate-900">{buscarPlantillaSistema(p.nombre)?.titulo}</p>
                    )}
                    <p className="truncate font-mono text-xs text-slate-500">{p.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {CATEGORIAS[p.categoria] ?? p.categoria} · {nombreIdioma(p.idioma)}
                      {p.variables > 0 && ` · ${p.variables} variable${p.variables > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                    {estado.texto}
                  </span>
                </div>
                <p className="flex-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {p.cuerpo || <span className="italic text-slate-400">(sin texto: usa imagen o botones)</span>}
                </p>
                {p.motivo_rechazo && (
                  <p className="mt-2 text-xs text-red-600">Motivo del rechazo: {p.motivo_rechazo}</p>
                )}
                {puedeGestionarPlantillasWhatsApp && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setAEliminar(p)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creando && (
        <NuevaPlantillaModal
          onCerrar={() => setCreando(false)}
          onCreada={(nueva) => {
            setPlantillas((prev) => [nueva, ...prev]);
            setCreando(false);
            mostrarToast("Plantilla enviada a revisión de Meta");
          }}
        />
      )}

      {aEliminar && (
        <ConfirmacionModal
          titulo="Eliminar plantilla"
          mensaje={`¿Eliminar "${aEliminar.nombre}" de la cuenta de WhatsApp? Esta acción no se puede deshacer.`}
          confirmando={eliminando}
          labelConfirmando="Eliminando…"
          onConfirmar={confirmarEliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}

      {editandoRapida && (
        <EditarPlantillaRapidaModal
          plantilla={editandoRapida}
          onCerrar={() => setEditandoRapida(null)}
          onGuardada={(guardada) => {
            setRapidas((prev) => prev.map((p) => (p.id === guardada.id ? guardada : p)));
            setEditandoRapida(null);
            mostrarToast("Plantilla guardada");
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
