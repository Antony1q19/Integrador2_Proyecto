"use client";

import { useState } from "react";
import { mockPostulantes } from "@/features/postulantes/data/mockPostulantes";
import AsociarPostulantesModal from "@/features/anuncios/components/AsociarPostulantesPortal";

interface PostulantesAsociadosProps {
  postulantesAsociadosIds: string[];
}

export default function PostulantesAsociados({
  postulantesAsociadosIds,
}: PostulantesAsociadosProps) {
  const [asociadosIds, setAsociadosIds] = useState<string[]>(
    postulantesAsociadosIds
  );
  const [modalAbierto, setModalAbierto] = useState(false);

  const postulantesAsociados = mockPostulantes.filter((p) =>
    asociadosIds.includes(p.id)
  );

  const handleConfirmar = (nuevosIds: string[]) => {
    setAsociadosIds(nuevosIds);
    setModalAbierto(false);
    // Aquí, más adelante, se llamaría a un servicio para persistir la
    // relación en el backend (ej. anunciosService.actualizarPostulantes(...))
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Postulantes Asociados ({postulantesAsociados.length})
        </h2>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + Asociar Postulante
        </button>
      </div>

      {postulantesAsociados.length === 0 ? (
        <p className="text-sm text-slate-400">
          Aún no hay postulantes asociados a esta vacante.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {postulantesAsociados.map((postulante) => (
            <li key={postulante.id} className="py-2">
              <p className="text-sm font-medium text-slate-800">
                {postulante.datosPersonales.nombres}{" "}
                {postulante.datosPersonales.apellidos}
              </p>
              <p className="text-xs text-slate-400">
                {postulante.estadoActual.replace("_", " ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {modalAbierto && (
        <AsociarPostulantesModal
          postulantesDisponibles={mockPostulantes}
          idsSeleccionados={asociadosIds}
          onConfirmar={handleConfirmar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}