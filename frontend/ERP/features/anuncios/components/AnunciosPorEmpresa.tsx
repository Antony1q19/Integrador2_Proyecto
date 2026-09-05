import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import { colorEstado } from "@/features/anuncios/utils/estado";

interface AnunciosPorEmpresaProps {
  empresaId: number;
}

export default function AnunciosPorEmpresa({
  empresaId,
}: AnunciosPorEmpresaProps) {
  const anuncios = anunciosMock.filter(
    (anuncio) => anuncio.empresaId === empresaId
  );

  if (anuncios.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Esta empresa aún no tiene anuncios publicados.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {anuncios.map((anuncio) => (
        <li
          key={anuncio.id}
          className="flex items-center justify-between py-3"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">
              {anuncio.cargo}
            </p>
            <p className="text-xs text-slate-400">
              {anuncio.numeroVacantes} vacante(s) · Vence{" "}
              {anuncio.fechaLimite}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstado(
              anuncio.estado
            )}`}
          >
            {anuncio.estado}
          </span>
        </li>
      ))}
    </ul>
  );
}