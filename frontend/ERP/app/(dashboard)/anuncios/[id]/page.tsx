/*import { notFound } from "next/navigation";
import AnuncioFicha from "@/features/anuncios/components/AnuncioFicha";
import { mapearAnuncioDeApi } from "@/features/anuncios/services/anunciosApi";
import { mapearPostulanteDeApi } from "@/features/postulantes/services/postulantesService";
import { obtenerDelGateway } from "@/lib/datosServidor";

type Dto = Record<string, unknown>;

export default async function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncioId = Number(id);
  if (!Number.isInteger(anuncioId)) notFound();

  // Si el anuncio es de una empresa que este usuario no tiene asignada, el backend responde 404.
  const dto = await obtenerDelGateway<Dto>(`/anuncios/${anuncioId}`);
  if (!dto) notFound();

  // Postulantes (solo los que este usuario puede ver) y sus postulaciones a este anuncio.
  const [postulantesApi, procesosApi] = await Promise.all([
    obtenerDelGateway<Dto[]>("/postulantes"),
    obtenerDelGateway<Dto[]>("/procesos"),
  ]);
  const procesosDelAnuncio = (procesosApi ?? []).filter((p) => p.anuncioId === anuncioId);
  const idsAsociados = procesosDelAnuncio.map((p) => p.postulanteId as string);

  // En este anuncio, el estado de cada postulante es la etapa de SU postulación a este anuncio.
  const postulantes = (postulantesApi ?? []).map(mapearPostulanteDeApi).map((postulante) => {
    const proceso = procesosDelAnuncio.find((p) => p.postulanteId === postulante.id);
    return proceso ? { ...postulante, estadoActual: proceso.estadoActual as typeof postulante.estadoActual } : postulante;
  });

  const anuncio = { ...mapearAnuncioDeApi(dto), postulantesAsociadosIds: idsAsociados };
  return <AnuncioFicha anuncio={anuncio} postulantes={postulantes} />;
}
*/

"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useAnuncio } from "@/features/anuncios/hooks/useAnuncio";
import { fetchPostulantes } from "@/features/postulantes/services/postulantesService";
import { Postulante } from "@/features/postulantes/types/postulante.types";
import AnuncioFicha from "@/features/anuncios/components/AnuncioFicha";

export default function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const anuncioId = Number(id);
  const { anuncio, cargando, error, noEncontrado } = useAnuncio(anuncioId);

  const [postulantes, setPostulantes] = useState<Postulante[]>([]);

  useEffect(() => {
    let cancelado = false;
    fetchPostulantes()
      .then((datos) => {
        if (!cancelado) setPostulantes(datos);
      })
      .catch(() => {
        // Falla "de mejor esfuerzo": si no cargan los postulantes, el
        // detalle del anuncio igual se muestra, solo sin ese listado.
      });
    return () => {
      cancelado = true;
    };
  }, []);
  
  if (noEncontrado) {
    notFound();
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-400">Cargando anuncio...</p>
        </div>
      </div>
    );
  }

  if (error || !anuncio) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">
            {error ?? "No se pudo cargar el anuncio"}
          </p>
        </div>
      </div>
    );
  }

  // TODO: postulantes reales pendientes de conectar con servicio-procesos-seleccion.
  // Ver nota en AnuncioFicha.tsx.
  return <AnuncioFicha anuncio={anuncio} postulantes={postulantes} />;
}