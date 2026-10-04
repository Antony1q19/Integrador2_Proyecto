"use client";

import { useState } from "react";
import Link from "next/link";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { colorEstado, estadoSiguiente } from "@/features/anuncios/utils/estado";

interface AnuncioFichaProps {
    anuncio: Anuncio;
    onCambiarEstado: (estado: EstadoAnuncio) => Promise<void>;
}

export default function AnuncioFicha({ anuncio, onCambiarEstado }: AnuncioFichaProps) {
    const [cambiando, setCambiando] = useState(false);
    const [errorEstado, setErrorEstado] = useState<string | null>(null);
    const siguiente = estadoSiguiente(anuncio.estado);

    const alternarEstado = async () => {
        setCambiando(true);
        setErrorEstado(null);
        try {
            await onCambiarEstado(siguiente);
        } catch (err) {
            setErrorEstado(err instanceof Error ? err.message : "No se pudo cambiar el estado");
        } finally {
            setCambiando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/anuncios"
                    className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-primary-600"
                >
                    ← Volver a Anuncios
                </Link>

                {/* Encabezado */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <h1 className="text-2xl font-semibold text-slate-900">
                                {anuncio.cargo}
                            </h1>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstado(
                                    anuncio.estado
                                )}`}
                            >
                                {anuncio.estado}
                            </span>
                        </div>
                        <Link
                            href={`/empresas/${anuncio.empresaId}`}
                            className="text-sm text-primary-600 hover:underline"
                        >
                            {anuncio.empresaRazonSocial}
                        </Link>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={alternarEstado}
                                disabled={cambiando}
                                className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-60 ${
                                    siguiente === "Cerrado"
                                        ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                            >
                                {cambiando
                                    ? "Guardando…"
                                    : siguiente === "Cerrado"
                                      ? "Cerrar anuncio"
                                      : "Abrir anuncio"}
                            </button>
                            <Link
                                href={`/anuncios/${anuncio.id}/editar`}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                Editar
                            </Link>
                        </div>
                        {errorEstado && <p className="text-xs text-red-500">{errorEstado}</p>}
                    </div>
                </div>

                {/* Datos generales */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-xs text-slate-400">Vacantes</dt>
                            <dd className="text-sm text-slate-800">
                                {anuncio.numeroVacantes}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-400">Salario Referencial</dt>
                            <dd className="text-sm text-slate-800">
                                {anuncio.salarioMin != null && anuncio.salarioMax != null
                                ? `S/ ${anuncio.salarioMin.toLocaleString()} - S/ ${anuncio.salarioMax.toLocaleString()}`
                                : "No especificado"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-400">Fecha Límite</dt>
                            <dd className="text-sm text-slate-800">
                                {anuncio.fechaLimite}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Descripción */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Descripción del Puesto
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-700">
                        {anuncio.descripcion ?? "Sin descripción registrada."}
                    </p>
                </div>

                {/* Requisitos */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Requisitos
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-700">
                        {anuncio.requisitos ?? "Sin requisitos registrados."}
                    </p>
                </div>

            </div>
        </div>
    );
}