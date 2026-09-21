// features/dashboard/components/KpiCard.tsx
//
// Una tarjeta con un indicador grande, su explicación corta y (opcional) una barra de avance.
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  titulo: string;
  valor: string;
  detalle?: string;
  icono: LucideIcon;
  color: string; // clases de gradiente de Tailwind, ej. "from-blue-500 to-cyan-400"
  progreso?: number; // 0-100, dibuja una barra
  ayuda?: string; // texto al pasar el mouse: cómo se calcula
}

export function KpiCard({ titulo, valor, detalle, icono: Icono, color, progreso, ayuda }: KpiCardProps) {
  return (
    <div
      title={ayuda}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm print:break-inside-avoid"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-500">{titulo}</p>
          <h3 className="text-3xl font-black text-slate-800">{valor}</h3>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>
          <Icono size={22} />
        </div>
      </div>
      {progreso !== undefined && (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-1.5 rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }} />
        </div>
      )}
      {detalle && <p className="mt-auto text-xs font-medium text-slate-400">{detalle}</p>}
    </div>
  );
}
