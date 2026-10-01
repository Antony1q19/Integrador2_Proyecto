// components/shared/Badge.tsx
//
// Etiqueta pequeña (estado, tipo, contador). Los tonos tienen significado fijo en todo el ERP:
//   neutro  → información sin estado          primario → destacado / de la marca
//   exito   → Activo, Contratado, Abierto     aviso    → Pendiente, En proceso
//   peligro → Suspendido, Descartado          info     → etapas intermedias
//
//   <Badge tono="exito">Activo</Badge>
import { HTMLAttributes } from "react";

export type TonoBadge = "neutro" | "primario" | "exito" | "aviso" | "peligro" | "info";

const TONOS: Record<TonoBadge, string> = {
  neutro: "bg-slate-100 text-slate-700",
  primario: "bg-primary-50 text-primary-700",
  exito: "bg-emerald-50 text-emerald-700",
  aviso: "bg-amber-50 text-amber-800",
  peligro: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-800",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tono?: TonoBadge;
}

export function Badge({ tono = "neutro", className = "", children, ...resto }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS[tono]} ${className}`}
      {...resto}
    >
      {children}
    </span>
  );
}
