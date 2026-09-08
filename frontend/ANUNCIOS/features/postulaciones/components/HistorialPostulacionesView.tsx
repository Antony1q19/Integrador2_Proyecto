'use client';

import { usePostulaciones } from '../hooks/usePostulaciones';
import { PostulacionCard } from './PostulacionCard';

export function HistorialPostulacionesView() {
  const { postulaciones, loading, error } = usePostulaciones();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100" />
        ))}
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
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Postulaciones</h1>
        <p className="text-gray-500 mt-1">
          Aquí puedes hacer seguimiento a todas tus postulaciones y ver su estado actual.
        </p>
      </div>

      <div className="space-y-4">
        {postulaciones.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">No tienes postulaciones</h3>
            <p className="text-gray-500 mt-2">Aún no te has postulado a ninguna oferta de empleo.</p>
          </div>
        ) : (
          postulaciones.map((postulacion) => (
            <PostulacionCard key={postulacion.id} postulacion={postulacion} />
          ))
        )}
      </div>
    </div>
  );
}
