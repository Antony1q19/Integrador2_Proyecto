import Link from "next/link";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { colorEstado } from "@/features/anuncios/utils/estado";
import PostulantesAsociados from "@/features/anuncios/components/PostulantesAsociados";

interface AnuncioFichaProps {
    anuncio: Anuncio;
}

export default function AnuncioFicha({ anuncio }: AnuncioFichaProps) {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/anuncios"
                    className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-indigo-600"
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
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            {anuncio.empresaRazonSocial}
                        </Link>
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
                                S/ {anuncio.salarioMin.toLocaleString()} - S/{" "}
                                {anuncio.salarioMax.toLocaleString()}
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
                        {anuncio.descripcion}
                    </p>
                </div>

                {/* Requisitos */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Requisitos
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-700">
                        {anuncio.requisitos}
                    </p>
                </div>

                {/* Postulantes asociados */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <PostulantesAsociados
                        postulantesAsociadosIds={anuncio.postulantesAsociadosIds}
                    />
                </div>
            </div>
        </div>
    );
}