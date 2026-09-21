// features/dashboard/components/TablasDashboard.tsx
//
// Las tablas del Dashboard: rendimiento por empresa (lo que se presenta a cada cliente) y detalle
// de cada vacante (anuncio), más las competencias evaluadas y la actividad reciente.
import { ESTILOS_ESTADO } from "@/features/postulantes/components/EstadoBadge";
import { ActividadReciente, DashboardDatos, FilaAnuncio, FilaEmpresa } from "../types/dashboard";

const encabezado = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400";
const celda = "px-3 py-3 text-sm text-slate-700";

function SinDatos({ texto }: { texto: string }) {
  return <p className="py-8 text-center text-sm text-slate-400">{texto}</p>;
}

// Barra de avance con su porcentaje.
function BarraCobertura({ porcentaje, detalle }: { porcentaje: number; detalle: string }) {
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>{detalle}</span>
        <span className="font-semibold text-slate-700">{Math.round(porcentaje)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${porcentaje >= 100 ? "bg-emerald-500" : "bg-violet-500"}`}
          style={{ width: `${Math.min(100, porcentaje)}%` }}
        />
      </div>
    </div>
  );
}

// --- Por empresa -------------------------------------------------------------
export function TablaEmpresas({ filas }: { filas: FilaEmpresa[] }) {
  if (filas.length === 0) return <SinDatos texto="No hay empresas para mostrar." />;

  const total = filas.reduce(
    (suma, f) => ({
      anunciosActivos: suma.anunciosActivos + f.anunciosActivos,
      vacantes: suma.vacantes + f.vacantes,
      postulaciones: suma.postulaciones + f.postulaciones,
      enProceso: suma.enProceso + f.enProceso,
      contratados: suma.contratados + f.contratados,
    }),
    { anunciosActivos: 0, vacantes: 0, postulaciones: 0, enProceso: 0, contratados: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={encabezado}>Empresa</th>
            <th className={`${encabezado} text-right`}>Anuncios activos</th>
            <th className={`${encabezado} text-right`}>Vacantes</th>
            <th className={`${encabezado} text-right`}>Postulaciones</th>
            <th className={`${encabezado} text-right`}>En proceso</th>
            <th className={`${encabezado} text-right`}>Contratados</th>
            <th className={`${encabezado} text-right`}>Tasa de contratación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((f) => (
            <tr key={f.empresaId} className="hover:bg-slate-50/50">
              <td className={`${celda} font-semibold text-slate-800`}>{f.razonSocial}</td>
              <td className={`${celda} text-right`}>{f.anunciosActivos}</td>
              <td className={`${celda} text-right`}>{f.vacantes}</td>
              <td className={`${celda} text-right`}>{f.postulaciones}</td>
              <td className={`${celda} text-right`}>{f.enProceso}</td>
              <td className={`${celda} text-right font-semibold text-emerald-600`}>{f.contratados}</td>
              <td className={`${celda} text-right`}>{f.tasaContratacion}%</td>
            </tr>
          ))}
        </tbody>
        {filas.length > 1 && (
          <tfoot className="border-t border-slate-200 bg-slate-50/60">
            <tr>
              <td className={`${celda} font-bold`}>Total</td>
              <td className={`${celda} text-right font-bold`}>{total.anunciosActivos}</td>
              <td className={`${celda} text-right font-bold`}>{total.vacantes}</td>
              <td className={`${celda} text-right font-bold`}>{total.postulaciones}</td>
              <td className={`${celda} text-right font-bold`}>{total.enProceso}</td>
              <td className={`${celda} text-right font-bold text-emerald-600`}>{total.contratados}</td>
              <td className={`${celda} text-right font-bold`}>
                {total.postulaciones ? Math.round((total.contratados * 1000) / total.postulaciones) / 10 : 0}%
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// --- Por anuncio (vacante) ---------------------------------------------------
const COLOR_ESTADO_ANUNCIO: Record<string, string> = {
  Abierto: "bg-emerald-50 text-emerald-700",
  "En proceso": "bg-amber-50 text-amber-700",
  Cerrado: "bg-slate-100 text-slate-500",
};

export function TablaAnuncios({ filas, mostrarEmpresa }: { filas: FilaAnuncio[]; mostrarEmpresa: boolean }) {
  if (filas.length === 0) return <SinDatos texto="No hay anuncios para mostrar." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={encabezado}>Vacante</th>
            {mostrarEmpresa && <th className={encabezado}>Empresa</th>}
            <th className={encabezado}>Estado</th>
            <th className={`${encabezado} text-right`}>Vacantes</th>
            <th className={`${encabezado} text-right`}>Postulaciones</th>
            <th className={`${encabezado} text-right`}>En proceso</th>
            <th className={`${encabezado} text-right`}>Contratados</th>
            <th className={encabezado} title="Contratados de todo el tiempo respecto a las vacantes que pidió la empresa">
              Cobertura
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((f) => (
            <tr key={f.anuncioId} className="hover:bg-slate-50/50">
              <td className={`${celda} font-semibold text-slate-800`}>{f.cargo}</td>
              {mostrarEmpresa && <td className={`${celda} text-slate-500`}>{f.empresaRazonSocial}</td>}
              <td className={celda}>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_ANUNCIO[f.estado] ?? "bg-slate-100 text-slate-500"}`}>
                  {f.estado}
                </span>
              </td>
              <td className={`${celda} text-right`}>{f.vacantes}</td>
              <td className={`${celda} text-right`}>{f.postulaciones}</td>
              <td className={`${celda} text-right`}>{f.enProceso}</td>
              <td className={`${celda} text-right font-semibold text-emerald-600`}>{f.contratados}</td>
              <td className={celda}>
                <BarraCobertura porcentaje={f.cobertura} detalle={`${Math.min(f.contratadosTotal, f.vacantes)} de ${f.vacantes}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Competencias evaluadas ---------------------------------------------------
export function CompetenciasBarras({ competencias }: { competencias: DashboardDatos["competencias"] }) {
  if (competencias.every((c) => c.promedio === null)) {
    return <SinDatos texto="No hay evaluaciones en este periodo." />;
  }
  return (
    <ul className="space-y-3">
      {competencias.map((c) => (
        <li key={c.clave}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">{c.etiqueta}</span>
            <span className="font-semibold text-slate-800">{c.promedio !== null ? `${c.promedio} / 5` : "—"}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${((c.promedio ?? 0) / 5) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Actividad reciente -------------------------------------------------------
export function ListaActividad({ actividad, nombres }: { actividad: ActividadReciente[]; nombres: Record<string, string> }) {
  if (actividad.length === 0) return <SinDatos texto="No hay cambios de etapa en este periodo." />;
  return (
    <ul className="divide-y divide-slate-50">
      {actividad.map((a, i) => {
        const estilo = ESTILOS_ESTADO[a.estado];
        return (
          <li key={`${a.postulanteId}-${a.fecha}-${i}`} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{nombres[a.postulanteId] ?? "Postulante"}</p>
              <p className="truncate text-xs text-slate-400">
                {a.cargo} · {a.empresa}
              </p>
              <p className="text-[11px] text-slate-400">
                {new Date(a.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })} · {a.usuario}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${estilo.bg} ${estilo.text}`}>{estilo.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
