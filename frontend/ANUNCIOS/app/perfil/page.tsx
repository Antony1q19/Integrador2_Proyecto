// app/perfil/page.tsx
import { Metadata } from 'next';
import { PerfilView } from '@/features/perfil/components/PerfilView';

export const metadata: Metadata = {
  title: 'Mi perfil | Bolsa de Trabajo',
  description: 'Administra tus datos, tu CV y tu experiencia para postular más rápido.',
};

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <PerfilView />
    </main>
  );
}
