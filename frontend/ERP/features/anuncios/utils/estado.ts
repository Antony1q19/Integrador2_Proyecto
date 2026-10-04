import { EstadoAnuncio } from "@/features/anuncios/types/anuncio";

// Estado al que pasa un anuncio con el botón Abrir/Cerrar. Un anuncio
// "En proceso" se cierra; uno "Cerrado" se vuelve a abrir.
export function estadoSiguiente(estado: EstadoAnuncio): EstadoAnuncio {
  return estado === "Cerrado" ? "Abierto" : "Cerrado";
}

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