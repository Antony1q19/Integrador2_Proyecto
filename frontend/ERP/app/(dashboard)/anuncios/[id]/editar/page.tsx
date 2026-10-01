import Link from "next/link";
import { notFound } from "next/navigation";
import EditarAnuncioForm from "@/features/anuncios/components/EditarAnuncioForm";
import { mapearAnuncioDeApi } from "@/features/anuncios/services/anunciosApi";
import { obtenerDelGateway } from "@/lib/datosServidor";

export default async function EditarAnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncioId = Number(id);

  // Solo llegan los anuncios que este usuario puede ver: si no está asignado, da 404.
  const anunciosApi = (await obtenerDelGateway<Record<string, unknown>[]>("/anuncios")) ?? [];
  const anuncioExistente = anunciosApi.map(mapearAnuncioDeApi).find((a) => a.id === anuncioId);

  if (!anuncioExistente) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/anuncios/${anuncioId}`}
          className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-primary-600"
        >
          ← Volver al Detalle
        </Link>

        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Editar Anuncio
        </h1>

        <EditarAnuncioForm anuncio={anuncioExistente} />
      </div>
    </div>
  );
}