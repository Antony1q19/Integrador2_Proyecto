// components/shared/Card.tsx
//
// Tarjeta/panel blanco estándar del ERP (rounded-xl, borde suave). Ver app/globals.css.
//
//   <Card>…</Card>
//   <Card titulo="Datos de contacto" acciones={<Button tamano="sm">Editar</Button>}>…</Card>
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** false = sin relleno interno (ej. para una tabla que llega hasta los bordes). */
  conRelleno?: boolean;
}

export function Card({ titulo, descripcion, acciones, conRelleno = true, className = "", children, ...resto }: CardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`} {...resto}>
      {(titulo || acciones) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {titulo && <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={conRelleno ? "p-5" : ""}>{children}</div>
    </div>
  );
}
