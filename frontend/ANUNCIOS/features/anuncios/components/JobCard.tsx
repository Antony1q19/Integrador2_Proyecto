// features/anuncios/components/JobCard.tsx
import { MapPin, Briefcase, Users } from 'lucide-react';
import { Anuncio } from '../types';
import { formatearSalario } from '../utils/formatearSalario';
import { formatearFechaRelativa } from '../utils/formatearFecha';

interface JobCardProps {
  anuncio: Anuncio;
  isSelected: boolean;
  onClick: () => void;
}

export default function JobCard({ anuncio, isSelected, onClick }: JobCardProps) {
  const { titulo, empresa, ubicacion, modalidad, salarioMin, salarioMax, destacado, numeroVacantes, fechaPublicacion } =
    anuncio;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`w-full text-left bg-white rounded-xl border p-4 transition-[border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
        // El resaltado de "seleccionada" solo tiene sentido en escritorio, donde está el panel de detalle.
        isSelected
          ? 'border-gray-200 hover:border-primary-300 lg:border-primary-600 lg:ring-2 lg:ring-primary-100 lg:shadow-sm'
          : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
      }`}
    >
      {destacado && (
        <span className="inline-block text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full mb-2">
          Postúlate rápidamente
        </span>
      )}

      <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1">
        {titulo}
      </h3>
      <p className="text-sm text-primary-700 font-medium mb-1">{empresa.nombre}</p>

      {ubicacion && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin size={12} />
          <span>{ubicacion}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
          {formatearSalario(salarioMin, salarioMax)}
        </span>
        {modalidad && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg capitalize">
            <Briefcase size={11} />
            {modalidad}
          </span>
        )}
        {numeroVacantes !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
            <Users size={11} />
            {numeroVacantes === 1 ? '1 vacante' : `${numeroVacantes} vacantes`}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">{formatearFechaRelativa(fechaPublicacion)}</p>
    </button>
  );
}
