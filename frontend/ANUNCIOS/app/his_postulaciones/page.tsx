import { Metadata } from 'next';
import { HistorialPostulacionesView } from '@/features/postulaciones/components/HistorialPostulacionesView';

export const metadata: Metadata = {
  title: 'Historial de Postulaciones | Bolsa de Trabajo',
  description: 'Haz seguimiento a tus postulaciones a ofertas de empleo.',
};

export default function HistorialPostulacionesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <HistorialPostulacionesView />
    </main>
  );
}
