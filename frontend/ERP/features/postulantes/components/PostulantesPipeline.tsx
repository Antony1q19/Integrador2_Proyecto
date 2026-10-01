// features/postulantes/components/PostulantesPipeline.tsx
//
// Vista Kanban del pipeline de selección (HU-09). Una TARJETA = una
// postulación puntual (postulante + anuncio), no un postulante entero: si
// alguien postuló a 2 anuncios, aparece con 2 tarjetas, cada una en la
// columna que le corresponde a ESA postulación (ver
// `procesosPostulacion` en el tipo Postulante). Arrastrar una tarjeta entre
// columnas cambia el estado de esa postulación específica, sin afectar sus
// otras postulaciones.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { EstadoProceso, Postulante } from "../types/postulante.types";
import { ESTILOS_ESTADO } from "./EstadoBadge";
import { OPCIONES_ESTADO } from "./EstadoSelector";
import { usePostulantesPipeline } from "../hooks/usePostulantesPipeline";
import { prefetchPostulante } from "../services/postulantesService";
import { ContratacionModal } from "@/features/contrataciones/components/ContratacionModal";
import { useToast, ToastContainer } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/Skeleton";

const TODAS_LAS_EMPRESAS = "TODAS";
const TODOS_LOS_PUESTOS = "TODOS";

const selectFiltroClass =
  "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

function iniciales(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

interface Tarjeta {
  id: string; // "<postulanteId>:<anuncioId>"
  postulante: Postulante;
  anuncio: Anuncio;
  estado: EstadoProceso;
}

export function PostulantesPipeline() {
  const { postulantes, anuncios, loading, error, moviendoId, moverEstadoPostulacion, recargar } = usePostulantesPipeline();
  // Soltar una tarjeta en "Contratado" pide antes los datos de la contratación (ingreso, contrato, salario).
  const [contratando, setContratando] = useState<Tarjeta | null>(null);
  const { toasts, mostrarToast } = useToast();
  const [columnaSobre, setColumnaSobre] = useState<EstadoProceso | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(TODAS_LAS_EMPRESAS);
  const [puestoFiltro, setPuestoFiltro] = useState<string>(TODOS_LOS_PUESTOS);

  // Una tarjeta por cada postulación (postulante + anuncio al que se
  // presentó), no una por postulante. Una postulación existe si figura en
  // `procesosPostulacion` (datos reales) o, en modo mock, en `postulantesAsociadosIds`.
  const tarjetas: Tarjeta[] = useMemo(
    () =>
      postulantes.flatMap((postulante) =>
        anuncios
          .filter(
            (anuncio) =>
              anuncio.postulantesAsociadosIds?.includes(postulante.id) ||
              String(anuncio.id) in postulante.procesosPostulacion
          )
          .map((anuncio) => ({
            id: `${postulante.id}:${anuncio.id}`,
            postulante,
            anuncio,
            estado: postulante.procesosPostulacion[String(anuncio.id)]?.estadoActual ?? "POSTULADO",
          }))
      ),
    [postulantes, anuncios]
  );

  // Los dos desplegables se ajustan entre sí: si eliges un puesto, "Empresa" solo ofrece
  // las empresas que tienen ese puesto...
  const empresas = useMemo(
    () =>
      Array.from(
        new Set(
          tarjetas
            .filter((t) => puestoFiltro === TODOS_LOS_PUESTOS || t.anuncio.cargo === puestoFiltro)
            .map((t) => t.anuncio.empresaRazonSocial)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [tarjetas, puestoFiltro]
  );
  // ...y si eliges una empresa, "Puesto" solo ofrece los puestos que existen en ella.
  const puestos = useMemo(
    () =>
      Array.from(
        new Set(
          tarjetas
            .filter((t) => empresaFiltro === TODAS_LAS_EMPRESAS || t.anuncio.empresaRazonSocial === empresaFiltro)
            .map((t) => t.anuncio.cargo)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [tarjetas, empresaFiltro]
  );

  const tarjetasFiltradas = useMemo(
    () =>
      tarjetas.filter(
        (t) =>
          (empresaFiltro === TODAS_LAS_EMPRESAS || t.anuncio.empresaRazonSocial === empresaFiltro) &&
          (puestoFiltro === TODOS_LOS_PUESTOS || t.anuncio.cargo === puestoFiltro)
      ),
    [tarjetas, empresaFiltro, puestoFiltro]
  );

  const hayFiltrosActivos = empresaFiltro !== TODAS_LAS_EMPRESAS || puestoFiltro !== TODOS_LOS_PUESTOS;

  const handleEmpresaChange = (nuevaEmpresa: string) => {
    setEmpresaFiltro(nuevaEmpresa);
    // Si el puesto ya elegido no existe en la nueva empresa, se limpia en
    // vez de dejar una combinación imposible que muestre 0 resultados sin
    // explicación.
    const puestoSigueValido =
      puestoFiltro === TODOS_LOS_PUESTOS ||
      tarjetas.some(
        (t) =>
          (nuevaEmpresa === TODAS_LAS_EMPRESAS || t.anuncio.empresaRazonSocial === nuevaEmpresa) &&
          t.anuncio.cargo === puestoFiltro
      );
    if (!puestoSigueValido) setPuestoFiltro(TODOS_LOS_PUESTOS);
  };

  const limpiarFiltros = () => {
    setEmpresaFiltro(TODAS_LAS_EMPRESAS);
    setPuestoFiltro(TODOS_LOS_PUESTOS);
  };

  const handleDrop = async (tarjeta: Tarjeta, estadoDestino: EstadoProceso) => {
    setColumnaSobre(null);
    if (tarjeta.estado === estadoDestino) return;
    if (estadoDestino === "CONTRATADO") {
      setContratando(tarjeta);
      return;
    }
    try {
      await moverEstadoPostulacion(tarjeta.postulante.id, String(tarjeta.anuncio.id), estadoDestino);
      mostrarToast(
        `${tarjeta.postulante.datosPersonales.nombres} ${tarjeta.postulante.datosPersonales.apellidos} · "${tarjeta.anuncio.cargo}" pasó a "${ESTILOS_ESTADO[estadoDestino].label}"`,
        "success"
      );
    } catch {
      mostrarToast("No se pudo actualizar el estado. Intenta nuevamente.", "error");
    }
  };

  if (loading) {
    return (
      <div aria-hidden className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex items-end gap-3 rounded-lg border border-gray-100 bg-white p-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-4">
          {OPCIONES_ESTADO.map((op, columna) => (
            <div key={op.value} className="flex w-64 shrink-0 flex-col gap-3 rounded-xl bg-slate-50/60 p-3">
              <div className="flex items-center justify-between px-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              {Array.from({ length: columna % 3 === 0 ? 2 : 1 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Pipeline de selección</h1>
        <p className="text-sm text-gray-500">
          Cada tarjeta es una postulación puntual: si alguien postuló a 2 anuncios, aparece 2 veces.
          Arrastra una tarjeta entre columnas para cambiar el estado de esa postulación. Las decisiones
          finales (Contratado / Descartado) se registran desde &quot;Dónde ha postulado&quot;, en la ficha.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-100 bg-white p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Empresa</label>
          <select
            value={empresaFiltro}
            onChange={(e) => handleEmpresaChange(e.target.value)}
            className={selectFiltroClass}
          >
            <option value={TODAS_LAS_EMPRESAS}>Todas las empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa} value={empresa}>
                {empresa}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Puesto</label>
          <select
            value={puestoFiltro}
            onChange={(e) => setPuestoFiltro(e.target.value)}
            className={selectFiltroClass}
          >
            <option value={TODOS_LOS_PUESTOS}>Todos los puestos</option>
            {puestos.map((puesto) => (
              <option key={puesto} value={puesto}>
                {puesto}
              </option>
            ))}
          </select>
        </div>
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {OPCIONES_ESTADO.map((op) => {
          const tarjetasColumna = tarjetasFiltradas.filter((t) => t.estado === op.value);

          return (
            <div
              key={op.value}
              onDragOver={(e) => {
                e.preventDefault();
                setColumnaSobre(op.value);
              }}
              onDragLeave={() => setColumnaSobre((prev) => (prev === op.value ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const tarjetaId = e.dataTransfer.getData("text/plain");
                const tarjeta = tarjetas.find((t) => t.id === tarjetaId);
                if (tarjeta) handleDrop(tarjeta, op.value);
              }}
              className={`flex w-64 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors ${
                columnaSobre === op.value
                  ? "border-primary-600 bg-primary-600/5"
                  : "border-transparent bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-gray-700">{op.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-400">
                  {tarjetasColumna.length}
                </span>
              </div>

              <div className="flex min-h-[60px] flex-col gap-2">
                {tarjetasColumna.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    className={`cursor-grab rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-opacity hover:border-gray-200 active:cursor-grabbing ${
                      moviendoId === t.id ? "opacity-50" : ""
                    }`}
                  >
                    <Link
                      href={`/postulantes/${t.postulante.id}`}
                      className="block"
                      onMouseEnter={() => prefetchPostulante(t.postulante.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white">
                          {iniciales(t.postulante.datosPersonales.nombres, t.postulante.datosPersonales.apellidos)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {t.postulante.datosPersonales.nombres} {t.postulante.datosPersonales.apellidos}
                          </p>
                          <p className="truncate text-xs text-gray-500">{t.anuncio.cargo}</p>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[11px] text-gray-400">{t.anuncio.empresaRazonSocial}</p>
                    </Link>
                  </div>
                ))}

                {tarjetasColumna.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-[11px] text-gray-300">
                    Sin postulaciones
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {contratando && (
        <ContratacionModal
          postulanteId={contratando.postulante.id}
          anuncioId={contratando.anuncio.id}
          cargoSugerido={contratando.anuncio.cargo}
          nombrePostulante={`${contratando.postulante.datosPersonales.nombres} ${contratando.postulante.datosPersonales.apellidos}`}
          onCerrar={() => setContratando(null)}
          onGuardada={() => {
            setContratando(null);
            mostrarToast(`Contratación registrada: "${contratando.anuncio.cargo}" pasó a "Contratado"`, "success");
            void recargar();
          }}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
