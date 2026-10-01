// app/anuncios/[id]/page.tsx
//
// Detalle público de un anuncio (sin iniciar sesión). Si el anuncio no existe, ya no está
// abierto o venció, el backend responde 404 y aquí se muestra la página "no encontrado".
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import JobDetailPanel from '@/features/anuncios/components/JobDetailPanel';
import { obtenerAnuncioPublico } from '@/features/anuncios/services/anunciosService';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const anuncio = await obtenerAnuncioPublico(id);
  if (!anuncio) return { title: 'Oferta no encontrada' };
  return {
    title: `${anuncio.titulo} - ${anuncio.empresa.nombre}`,
    description: anuncio.descripcion.slice(0, 160),
  };
}

export default async function AnuncioDetallePage({ params }: Props) {
  const { id } = await params;
  const anuncio = await obtenerAnuncioPublico(id);
  if (!anuncio) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
        >
          <ArrowLeft size={16} /> Volver a las ofertas
        </Link>
        <JobDetailPanel anuncio={anuncio} />
      </div>
    </main>
  );
}
