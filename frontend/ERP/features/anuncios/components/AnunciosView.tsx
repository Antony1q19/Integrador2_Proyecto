import Link from "next/link";
import { Anuncio } from "@/features/anuncios/types/anuncio";
import { colorEstado } from "@/features/anuncios/utils/estado";

interface AnunciosViewProps {
    anuncios: Anuncio[];
}

export default function AnunciosView({ anuncios }: AnunciosViewProps) {
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
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {anuncios.map((anuncio) => (
                        <tr key={anuncio.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <Link
                                    href={`/anuncios/${anuncio.id}`}
                                    className="text-sm font-medium text-indigo-600 hover:underline"
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
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstado(
                                        anuncio.estado
                                    )}`}
                                >
                                    {anuncio.estado}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}