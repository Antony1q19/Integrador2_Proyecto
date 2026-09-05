// app/page.tsx
import { Metadata } from 'next';
import AnunciosBuscador from '@/features/anuncios/components/AnunciosBuscador';
import { anunciosMock } from '@/features/anuncios/data/anuncios.mock';

export const metadata: Metadata = {
  title: 'Encuentra empleo | Bolsa de Trabajo',
  description: 'Explora las mejores ofertas de empleo publicadas por empresas verificadas.',
};

export default function HomePage() {
  return <AnunciosBuscador anuncios={anunciosMock} />;
}