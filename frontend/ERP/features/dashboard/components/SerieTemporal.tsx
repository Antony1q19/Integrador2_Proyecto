// features/dashboard/components/SerieTemporal.tsx
//
// Gráfica en el tiempo, dibujada con SVG (sin librerías): barras = postulaciones recibidas y
// línea = contrataciones. Cada punto es un día, una semana o un mes según el largo del rango.
import { Granularidad, PuntoSerie } from "../types/dashboard";
import { etiquetaCorta, formatoCompleto } from "../utils/fechas";

const ANCHO = 680;
const ALTO = 250;
const MARGEN = { izquierda: 34, derecha: 12, arriba: 10, abajo: 30 };

// Un tope "redondo" para el eje vertical (4, 8, 12...), así las líneas guía caen en números enteros.
function topeDelEje(maximo: number): number {
  return maximo <= 4 ? 4 : Math.ceil(maximo / 4) * 4;
}

interface SerieTemporalProps {
  puntos: PuntoSerie[];
  granularidad: Granularidad;
}

export function SerieTemporal({ puntos, granularidad }: SerieTemporalProps) {
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const tope = topeDelEje(Math.max(0, ...puntos.flatMap((p) => [p.postulaciones, p.contrataciones])));
  const hayActividad = puntos.some((p) => p.postulaciones > 0 || p.contrataciones > 0);

  const anchoColumna = anchoUtil / Math.max(1, puntos.length);
  const x = (i: number) => MARGEN.izquierda + (i + 0.5) * anchoColumna;
  const y = (valor: number) => MARGEN.arriba + altoUtil - (valor / tope) * altoUtil;

  // Se muestran unas 6 etiquetas de fecha, repartidas parejo, para que no se encimen.
  const paso = Math.max(1, Math.ceil(puntos.length / 6));
  const lineaContrataciones = puntos.map((p, i) => `${x(i)},${y(p.contrataciones)}`).join(" ");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Postulaciones recibidas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-emerald-500" /> Contrataciones
        </span>
        <span className="text-slate-400">
          (agrupado por {granularidad === "dia" ? "día" : granularidad === "semana" ? "semana" : "mes"})
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img" aria-label="Postulaciones y contrataciones en el tiempo">
          {/* Líneas guía y números del eje vertical */}
          {[0, 1, 2, 3, 4].map((n) => {
            const valor = (tope / 4) * n;
            return (
              <g key={n}>
                <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(valor)} y2={y(valor)} stroke="#e2e8f0" strokeWidth={1} />
                <text x={MARGEN.izquierda - 6} y={y(valor) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
                  {valor}
                </text>
              </g>
            );
          })}

          {/* Barras: postulaciones */}
          {puntos.map((p, i) =>
            p.postulaciones > 0 ? (
              <rect
                key={p.fecha}
                x={x(i) - (anchoColumna * 0.7) / 2}
                y={y(p.postulaciones)}
                width={anchoColumna * 0.7}
                height={MARGEN.arriba + altoUtil - y(p.postulaciones)}
                rx={2}
                fill="#3b82f6"
              />
            ) : null
          )}

          {/* Línea: contrataciones */}
          {puntos.some((p) => p.contrataciones > 0) && (
            <>
              <polyline points={lineaContrataciones} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
              {puntos.map((p, i) =>
                p.contrataciones > 0 ? <circle key={p.fecha} cx={x(i)} cy={y(p.contrataciones)} r={4} fill="#10b981" stroke="#fff" strokeWidth={1.5} /> : null
              )}
            </>
          )}

          {/* Etiquetas de fecha */}
          {puntos.map((p, i) =>
            i % paso === 0 ? (
              <text key={p.fecha} x={x(i)} y={ALTO - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">
                {etiquetaCorta(p.fecha, granularidad)}
              </text>
            ) : null
          )}

          {/* Zonas invisibles por columna: al pasar el mouse muestran el detalle */}
          {puntos.map((p, i) => (
            <rect key={`hover-${p.fecha}`} x={x(i) - anchoColumna / 2} y={MARGEN.arriba} width={anchoColumna} height={altoUtil} fill="transparent">
              <title>
                {granularidad === "dia" ? formatoCompleto(p.fecha) : `${granularidad === "semana" ? "Semana del " : "Mes de "}${formatoCompleto(p.fecha)}`}
                {`\nPostulaciones: ${p.postulaciones}\nContrataciones: ${p.contrataciones}`}
              </title>
            </rect>
          ))}
        </svg>

        {!hayActividad && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Sin actividad en este periodo
          </p>
        )}
      </div>
    </div>
  );
}
