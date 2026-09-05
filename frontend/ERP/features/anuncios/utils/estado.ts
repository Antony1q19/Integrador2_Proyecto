import { EstadoAnuncio } from "@/features/anuncios/types/anuncio";

export function colorEstado(estado: EstadoAnuncio): string {
  switch (estado) {
    case "Abierto":
      return "bg-emerald-100 text-emerald-700";
    case "En proceso":
      return "bg-amber-100 text-amber-700";
    case "Cerrado":
      return "bg-slate-200 text-slate-600";
  }
}