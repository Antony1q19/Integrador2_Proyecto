// app/page.tsx
//
// Página pública: cualquiera ve los anuncios sin iniciar sesión. Es un Server Component: los
// anuncios se piden desde el servidor de Next.js (ver features/anuncios/services/anunciosService.ts),
// así el navegador nunca habla directo con el backend.
import { Metadata } from 'next';
import AnunciosBuscador from '@/features/anuncios/components/AnunciosBuscador';
import { obtenerAnunciosPublicos } from '@/features/anuncios/services/anunciosService';
import { Anuncio } from '@/features/anuncios/types';

export const metadata: Metadata = {
  title: 'Encuentra empleo',
  description: 'Explora las ofertas de empleo de nuestras empresas clientes y postula en minutos.',
};

export default async function HomePage() {
  let anuncios: Anuncio[];
  try {
    anuncios = await obtenerAnunciosPublicos();
  } catch (error) {
    // El detalle técnico queda en el log del servidor; al visitante solo se le muestra un aviso.
    console.error('No se pudieron cargar los anuncios:', error);
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-lg font-semibold text-gray-900">No pudimos cargar las ofertas</h1>
          <p className="mt-2 text-sm text-gray-500">Intenta nuevamente en unos minutos.</p>
        </div>
      </main>
    );
  }

  return <AnunciosBuscador anuncios={anuncios} />;
}
