import { Postulacion, EstadoProceso } from '../types';

interface PostulacionCardProps {
  postulacion: Postulacion;
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const badgeConfig: Record<EstadoProceso, { bg: string; text: string }> = {
  'En proceso': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'Finalizado': { bg: 'bg-green-50', text: 'text-green-600' },
  'Cancelado': { bg: 'bg-red-50', text: 'text-red-600' },
};

export function PostulacionCard({ postulacion }: PostulacionCardProps) {
  const badge = badgeConfig[postulacion.estadoProceso];

  const pasos = [
    { num: 1, label: 'Postulado' },
    { num: 2, label: 'Evaluación' },
    { num: 3, label: 'Entrevista' },
    { num: 4, label: 'Preseleccionado' },
    { num: 5, label: 'Contratado' },
  ];

  // Etiqueta legible del estado real del backend
  const etiquetaEstado = postulacion.estadoActual
    ? {
        POSTULADO: 'Postulado',
        EN_EVALUACION: 'En Evaluación',
        ENTREVISTA: 'Entrevista',
        PRESELECCIONADO: 'Preseleccionado',
        CONTRATADO: 'Contratado',
        DESCARTADO: 'Descartado',
      }[postulacion.estadoActual] ?? postulacion.estadoProceso
    : postulacion.estadoProceso;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-lg font-semibold text-gray-900">
          {postulacion.cargo || `Anuncio #${postulacion.anuncioId}`}
        </h3>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ml-4 whitespace-nowrap`}>
          {etiquetaEstado}
        </span>
      </div>

      {postulacion.empresa && (
        <p className="text-gray-600 text-sm mb-1">{postulacion.empresa}</p>
      )}

      {postulacion.fechaPostulacion && (
        <p className="text-gray-400 text-xs font-medium mb-6">
          Postulado el {formatDate(postulacion.fechaPostulacion)}
        </p>
      )}

      <div className="border-t border-gray-100 mb-6"></div>

      {/* Progress Bar */}
      <div className="flex items-start justify-between">
        {pasos.map((paso, index) => {
          const isActive = postulacion.pasoActual === paso.num;
          const isPast = postulacion.pasoActual > paso.num;
          const isCompletedOrActive = isActive || isPast;
          const isNextCompletedOrActive = postulacion.pasoActual > paso.num;

          return (
            <div key={paso.num} className="flex-1 flex items-center pt-2">
              <div className="flex flex-col items-center relative w-full">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold bg-white mb-2 transition-colors z-10
                    ${isCompletedOrActive
                      ? 'border-slate-700 text-slate-800'
                      : 'border-gray-200 text-gray-300'
                    }`}
                >
                  {paso.num}
                </div>
                <span
                  className={`text-xs font-medium text-center absolute top-10 whitespace-nowrap ${
                    isCompletedOrActive ? 'text-slate-800' : 'text-gray-300'
                  }`}
                >
                  {paso.label}
                </span>

                {index < pasos.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-[2px] z-0 ${
                      isNextCompletedOrActive ? 'bg-slate-300' : 'bg-gray-100'
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-6"></div>
    </div>
  );
}