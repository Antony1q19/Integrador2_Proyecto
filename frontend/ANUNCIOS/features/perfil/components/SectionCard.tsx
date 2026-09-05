// features/perfil/components/SectionCard.tsx
//
// Contenedor visual compartido por todas las secciones del perfil: título +
// acción opcional a la derecha (ej. "Editar" / "+ Agregar").
import { ReactNode } from 'react';

interface SectionCardProps {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ titulo, accion, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
