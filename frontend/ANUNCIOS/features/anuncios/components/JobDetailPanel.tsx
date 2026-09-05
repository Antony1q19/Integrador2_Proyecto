// features/anuncios/components/JobDetailPanel.tsx
import { MapPin, Briefcase, DollarSign, Bookmark, Share2 } from 'lucide-react';
import { Anuncio } from '../types';
import { formatearSalario } from '../utils/formatearSalario';
import { formatearFechaRelativa } from '../utils/formatearFecha';

interface JobDetailPanelProps {
  anuncio: Anuncio;
}

export default function JobDetailPanel({ anuncio }: JobDetailPanelProps) {
  const { titulo, empresa, ubicacion, modalidad, salarioMin, salarioMax, descripcion, requisitos, fechaPublicacion } = anuncio;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{titulo}</h2>
        <p className="text-purple-700 font-semibold mb-1">{empresa.nombre}</p>
        <p className="text-sm text-gray-500 mb-4">{ubicacion}</p>

        <div className="flex items-center gap-3">
          <button
            className="bg-purple-700 hover:bg-purple-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            onClick={() => alert('Funcionalidad de postulación pendiente de implementar')}
          >
            Postularme a esta oferta
          </button>
          <button
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
            aria-label="Guardar oferta"
          >
            <Bookmark size={18} className="text-gray-600" />
          </button>
          <button
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
            aria-label="Compartir oferta"
          >
            <Share2 size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <hr className="border-gray-200 mb-5" />

      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Información del empleo</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <DollarSign size={16} className="text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sueldo</p>
              <span className="inline-block text-sm bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                {formatearSalario(salarioMin, salarioMax)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <Briefcase size={16} className="text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo de empleo</p>
              <span className="inline-block text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                {modalidad}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <MapPin size={16} className="text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ubicación</p>
              <p className="text-sm text-gray-700">{ubicacion}</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 mb-5" />

      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Descripción del puesto</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{descripcion}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Requisitos</h3>
        <ul className="space-y-2">
          {requisitos.map((req, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-purple-400 mt-1">•</span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-400">{formatearFechaRelativa(fechaPublicacion)}</p>
    </div>
  );
}