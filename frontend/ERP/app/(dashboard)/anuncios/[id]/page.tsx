import { notFound } from "next/navigation";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";
import AnuncioFicha from "@/features/anuncios/components/AnuncioFicha";

export default async function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncioId = Number(id);
  const anuncio = anunciosMock.find((a) => a.id === anuncioId);

  if (!anuncio) {
    notFound();
  }

  return <AnuncioFicha anuncio={anuncio} />;
}