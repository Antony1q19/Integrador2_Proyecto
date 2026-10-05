// features/anuncios/components/JobDetailPanel.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Briefcase, DollarSign, Share2, Users, CalendarClock, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Anuncio } from '../types';
import { formatearSalario } from '../utils/formatearSalario';
import { formatearFechaRelativa } from '../utils/formatearFecha';
import { postularseAAnuncio } from '@/features/postulaciones/services/postulacionesService';

interface JobDetailPanelProps {
  anuncio: Anuncio;
}

export default function JobDetailPanel({ anuncio }: JobDetailPanelProps) {
  const {
    titulo, empresa, ubicacion, modalidad, salarioMin, salarioMax, descripcion, requisitos,
    fechaPublicacion, numeroVacantes, fechaLimite,
  } = anuncio;
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const [aviso, setAviso] = useState<string | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const [postulando, setPostulando] = useState(false);

  // Sin sesión → al login, y de vuelta a ESTE anuncio al entrar.
  // Con sesión → crea la postulación en el backend y redirige al historial.
  const postular = async () => {
    if (!estaAutenticado || !usuario?.postulanteId) {
      router.push(`/login?motivo=postular&siguiente=${encodeURIComponent(`/anuncios/${anuncio.id}`)}`);
      return;
    }

    setPostulando(true);
    setAviso(null);
    try {
      await postularseAAnuncio({
        anuncioId: Number(anuncio.id),
        postulanteId: usuario.postulanteId,
      });
      setAviso('¡Te postulaste correctamente! Redirigiendo a tu historial...');
      setTimeout(() => router.push('/his_postulaciones'), 1500);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo completar la postulación');
    } finally {
      setPostulando(false);
    }
  };

  const compartir = async () => {
    const url = `${window.location.origin}/anuncios/${anuncio.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${titulo} - ${empresa.nombre}`, url });
      } catch {
        // La persona cerró el menú de compartir: no es un error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      setAviso(`Copia este enlace: ${url}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{titulo}</h2>
        <p className="text-primary-700 font-semibold mb-1">{empresa.nombre}</p>
        <p className="text-sm text-gray-500 mb-4">{ubicacion ?? empresa.rubro}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={postulando}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={postular}
          >
            {postulando ? 'Postulando...' : 'Postularme a esta oferta'}
          </button>
          <button
            type="button"
            onClick={() => void compartir()}
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {enlaceCopiado ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} className="text-gray-600" />}
            {enlaceCopiado ? 'Enlace copiado' : 'Compartir'}
          </button>
        </div>
        {aviso && (
          <p role="status" className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
            {aviso}
          </p>
        )}
      </div>

      <hr className="border-gray-200 mb-5" />

      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Información del empleo</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary-50 p-2 rounded-lg">
              <DollarSign size={16} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Sueldo</p>
              <span className="inline-block text-sm bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                {formatearSalario(salarioMin, salarioMax)}
              </span>
            </div>
          </div>

          {modalidad && (
            <div className="flex items-start gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <Briefcase size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo de empleo</p>
                <span className="inline-block text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                  {modalidad}
                </span>
              </div>
            </div>
          )}

          {ubicacion && (
            <div className="flex items-start gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <MapPin size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Ubicación</p>
                <p className="text-sm text-gray-700">{ubicacion}</p>
              </div>
            </div>
          )}

          {numeroVacantes !== undefined && (
            <div className="flex items-start gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <Users size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Vacantes</p>
                <p className="text-sm text-gray-700">{numeroVacantes}</p>
              </div>
            </div>
          )}

          {fechaLimite && (
            <div className="flex items-start gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <CalendarClock size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Postula hasta</p>
                <p className="text-sm text-gray-700">
                  {new Date(`${fechaLimite}T00:00:00`).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}
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
              <span className="text-primary-400 mt-1">•</span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-500">{formatearFechaRelativa(fechaPublicacion)}</p>
    </div>
  );
}