"use client";

import { useState } from "react";
import Link from "next/link";
import { Anuncio, EstadoAnuncio } from "@/features/anuncios/types/anuncio";
import { colorEstado, estadoSiguiente } from "@/features/anuncios/utils/estado";
import ConfirmacionModal from "@/components/shared/ConfirmacionModal";

interface AnunciosViewProps {
    anuncios: Anuncio[];
    onEliminar: (id: number) => Promise<void>;
    onCambiarEstado: (id: number, estado: EstadoAnuncio) => Promise<void>;
    /** false = solo lectura (RRHH): sin cambiar estado ni eliminar. */
    puedeGestionar?: boolean;
}

export default function AnunciosView({ anuncios, onEliminar, onCambiarEstado, puedeGestionar = true }: AnunciosViewProps) {
    
    const [anuncioAEliminar, setAnuncioAEliminar] = useState<Anuncio | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [errorPorFila, setErrorPorFila] = useState<Record<number, string>>({});
    const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null);

    // Clic en el estado: Abierto/En proceso -> Cerrado, Cerrado -> Abierto.
    const alternarEstado = async (anuncio: Anuncio) => {
        setCambiandoEstadoId(anuncio.id);
        setErrorPorFila((prev) => {
            const { [anuncio.id]: _omitido, ...resto } = prev;
            return resto;
        });
        try {
            await onCambiarEstado(anuncio.id, estadoSiguiente(anuncio.estado));
        } catch (err) {
            setErrorPorFila((prev) => ({
                ...prev,
                [anuncio.id]: err instanceof Error ? err.message : "No se pudo cambiar el estado",
            }));
        } finally {
            setCambiandoEstadoId(null);
        }
    };

    const confirmarEliminacion = async () => {
        if (!anuncioAEliminar) return;

        setEliminando(true);
        try {
        await onEliminar(anuncioAEliminar.id);
        setAnuncioAEliminar(null);
        } catch (err) {
        setErrorPorFila((prev) => ({
            ...prev,
            [anuncioAEliminar.id]: err instanceof Error ? err.message : "No se pudo eliminar",
        }));
        setAnuncioAEliminar(null);
        } finally {
        setEliminando(false);
        }
    };

    if (anuncios.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-400">
                    No se encontraron anuncios con los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Cargo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Empresa
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Vacantes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Fecha Límite
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Estado
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {anuncios.map((anuncio) => (
                        <tr key={anuncio.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <Link
                                    href={`/anuncios/${anuncio.id}`}
                                    className="text-sm font-medium text-primary-600 hover:underline"
                                >
                                    {anuncio.cargo}
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                                {anuncio.empresaRazonSocial}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-slate-800">
                                {anuncio.numeroVacantes}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                                {anuncio.fechaLimite}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {!puedeGestionar ? (
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstado(anuncio.estado)}`}>
                                        {anuncio.estado}
                                    </span>
                                ) : (
                                <button
                                    type="button"
                                    onClick={() => alternarEstado(anuncio)}
                                    disabled={cambiandoEstadoId === anuncio.id}
                                    title={
                                        estadoSiguiente(anuncio.estado) === "Cerrado"
                                            ? "Clic para cerrar el anuncio"
                                            : "Clic para abrir el anuncio"
                                    }
                                    className={`inline-flex cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium ring-offset-1 transition hover:ring-2 hover:ring-slate-300 disabled:cursor-wait disabled:opacity-60 ${colorEstado(
                                        anuncio.estado
                                    )}`}
                                >
                                    {cambiandoEstadoId === anuncio.id ? "…" : anuncio.estado}
                                </button>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {puedeGestionar && (
                                <button
                                    type="button"
                                    onClick={() => setAnuncioAEliminar(anuncio)}
                                    title="Eliminar anuncio"
                                    className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.8}
                                        className="h-5 w-5"
                                    >
                                        <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7h12Z"
                                        />
                                    </svg>
                                </button>
                                )}
                                {errorPorFila[anuncio.id] && (
                                    <p className="mt-1 max-w-[160px] text-xs text-red-500">
                                        {errorPorFila[anuncio.id]}
                                    </p>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {anuncioAEliminar && (
                <ConfirmacionModal
                titulo="Eliminar anuncio"
                mensaje={`¿Eliminar el anuncio "${anuncioAEliminar.cargo}"? Dejará de aparecer en el ERP y en el portal de anuncios.`}
                confirmando={eliminando}
                labelConfirmando="Eliminando…"
                onConfirmar={confirmarEliminacion}
                onCancelar={() => setAnuncioAEliminar(null)}
                />
            )}
        </div>
    );
}