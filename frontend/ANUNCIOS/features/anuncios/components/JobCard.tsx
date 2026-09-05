// features/anuncios/components/JobCard.tsx
import { MapPin, Briefcase } from 'lucide-react';
import { Anuncio } from '../types';
import { formatearSalario } from '../utils/formatearSalario';

interface JobCardProps {
  anuncio: Anuncio;
  isSelected: boolean;
  onClick: () => void;
}

export default function JobCard({ anuncio, isSelected, onClick }: JobCardProps) {
  const { titulo, empresa, ubicacion, modalidad, salarioMin, salarioMax, destacado } = anuncio;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-4 transition-all duration-150 ${
        isSelected
          ? 'border-purple-600 ring-2 ring-purple-100 shadow-sm'
          : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
      }`}
    >
      {destacado && (
        <span className="inline-block text-xs font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full mb-2">
          Postúlate rápidamente
        </span>
      )}

      <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1">
        {titulo}
      </h3>
      <p className="text-sm text-purple-700 font-medium mb-1">{empresa.nombre}</p>

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <MapPin size={12} />
        <span>{ubicacion}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
          {formatearSalario(salarioMin, salarioMax)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
          <Briefcase size={11} />
          {modalidad}
        </span>
      </div>
    </button>
  );
}   