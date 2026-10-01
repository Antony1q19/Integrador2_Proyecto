// components/shared/Button.tsx
//
// Botón único del ERP. Usarlo en vez de escribir las clases a mano en cada pantalla, así todos
// los botones se ven igual (color "primary", rounded-lg, mismos tamaños; ver app/globals.css).
//
//   <Button>Guardar</Button>                          → principal (índigo)
//   <Button variante="secundario">Cancelar</Button>   → borde gris
//   <Button variante="peligro">Eliminar</Button>      → rojo
//   <Button variante="fantasma" tamano="sm">…</Button> → sin fondo
//   <Button cargando>Guardar</Button>                 → deshabilitado + "Guardando…" si se pasa textoCargando
import { ButtonHTMLAttributes, forwardRef } from "react";

export type VarianteBoton = "primario" | "secundario" | "peligro" | "fantasma";
export type TamanoBoton = "sm" | "md" | "lg";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-500",
  secundario:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-primary-500",
  peligro: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500",
  fantasma: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-primary-500",
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

/** Las clases del botón, por si hace falta aplicarlas a un <Link>. */
export function clasesBoton(variante: VarianteBoton = "primario", tamano: TamanoBoton = "md", extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTES[variante],
    TAMANOS[tamano],
    extra,
  ].join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  textoCargando?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = "primario", tamano = "md", cargando = false, textoCargando, className = "", disabled, type = "button", children, ...resto },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clasesBoton(variante, tamano, className)}
      {...resto}
    >
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
});
