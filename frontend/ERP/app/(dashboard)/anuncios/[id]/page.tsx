import { notFound } from "next/navigation";
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
