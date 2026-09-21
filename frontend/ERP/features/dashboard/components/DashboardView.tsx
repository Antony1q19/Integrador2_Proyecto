// features/dashboard/components/DashboardView.tsx
//
// Dashboard principal: indicadores de operación y de presentación a las empresas, con filtro por
// empresa y por rango de fechas. Todos los datos salen de la base de datos (GET /dashboard); cada
// persona ve solo las empresas que tiene asignadas (un Admin ve todas).
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Briefcase,
  ClipboardCheck,
  Timer,
  Trophy,
  TrendingUp,
  UserRoundX,
  Users,
  Hourglass,
} from "lucide-react";
import { Empresa } from "@/features/empresas/types/empresa";
import { fetchEmpresas } from "@/features/empresas/services/empresasApi";
import { DashboardDatos, FiltrosDashboard as Filtros } from "../types/dashboard";
import { useDashboard } from "../hooks/useDashboard";
import { aTexto, formatoCompleto, sumarDias } from "../utils/fechas";
import { descargarReporteCsv } from "../utils/exportarCsv";
import { FiltrosDashboard } from "./FiltrosDashboard";
import { KpiCard } from "./KpiCard";
import { EmbudoSeleccion } from "./EmbudoSeleccion";
import { SerieTemporal } from "./SerieTemporal";
import { CompetenciasBarras, ListaActividad, TablaAnuncios, TablaEmpresas } from "./TablasDashboard";

// La fecha de hoy solo existe en el navegador (en el servidor podría ser otro día por la zona
// horaria); con useSyncExternalStore el servidor no la dibuja y se evita un desajuste al cargar.
const suscribir = () => () => {};
const hoyDelNavegador = () => aTexto(new Date());
const hoyDelServidor = () => "";

function Tarjeta({ titulo, subtitulo, children, className = "" }: { titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:break-inside-avoid ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
        {subtitulo && <p className="text-xs text-slate-400">{subtitulo}</p>}
      </div>
      {children}
    </section>
  );
}

// Todos los indicadores (tarjetas, gráficas y tablas) a partir de los datos ya cargados.
export function IndicadoresDashboard({
  datos,
  nombres,
  mostrarEmpresa,
}: {
  datos: DashboardDatos;
  nombres: Record<string, string>;
  mostrarEmpresa: boolean;
}) {
  const r = datos.resumen;
  return (
    <div className="space-y-6">
      {/* Indicadores de operación */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Postulaciones"
          valor={String(r.postulaciones)}
          detalle={`${r.postulantesUnicos} ${r.postulantesUnicos === 1 ? "postulante" : "postulantes"} distintos`}
          icono={Users}
          color="from-blue-500 to-cyan-400"
          ayuda="Postulaciones recibidas dentro del rango de fechas."
        />
        <KpiCard
          titulo="En proceso"
          valor={String(r.enProceso)}
          detalle="Aún sin decisión final"
          icono={Hourglass}
          color="from-amber-500 to-orange-400"
          ayuda="Postulaciones del periodo que no están Contratadas ni Descartadas."
        />
        <KpiCard
          titulo="Contratados"
          valor={String(r.contratados)}
          detalle={`${r.tasaContratacion}% de las postulaciones`}
          icono={Trophy}
          color="from-emerald-400 to-teal-500"
          progreso={r.tasaContratacion}
          ayuda="Tasa de contratación = contratados / postulaciones del periodo."
        />
        <KpiCard
          titulo="Descartados"
          valor={String(r.descartados)}
          detalle={`${r.tasaDescarte}% de las postulaciones`}
          icono={UserRoundX}
          color="from-rose-500 to-pink-400"
          progreso={r.tasaDescarte}
        />
      </div>

      {/* Indicadores para presentar a las empresas */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Días para contratar"
          valor={r.diasPromedioContratacion !== null ? String(r.diasPromedioContratacion) : "—"}
          detalle={r.diasPromedioContratacion !== null ? "Promedio desde que postula hasta que lo contratan" : "Aún no hay contrataciones en el periodo"}
          icono={Timer}
          color="from-violet-500 to-purple-500"
          ayuda="Promedio de días entre la fecha de postulación y la fecha en que se marcó Contratado (postulaciones contratadas del periodo)."
        />
        <KpiCard
          titulo="Vacantes cubiertas"
          valor={`${r.vacantesCubiertas} de ${r.vacantesActivas}`}
          detalle={`${r.coberturaVacantes}% de las vacantes de los anuncios activos`}
          icono={TrendingUp}
          color="from-indigo-500 to-blue-500"
          progreso={r.coberturaVacantes}
          ayuda="Contratados (de todo el tiempo) respecto a las vacantes que pidieron las empresas en sus anuncios activos."
        />
        <KpiCard
          titulo="Anuncios activos"
          valor={String(r.anunciosActivos)}
          detalle={`${r.vacantesActivas} ${r.vacantesActivas === 1 ? "vacante" : "vacantes"} por cubrir`}
          icono={Briefcase}
          color="from-fuchsia-500 to-pink-500"
          ayuda="Anuncios que no están Cerrados (foto de hoy, no depende del rango)."
        />
        <KpiCard
          titulo="Puntaje de evaluaciones"
          valor={r.puntajePromedio !== null ? `${r.puntajePromedio}/100` : "—"}
          detalle={r.evaluaciones > 0 ? `${r.porcentajeApto}% aptos · ${r.evaluaciones} ${r.evaluaciones === 1 ? "evaluación" : "evaluaciones"}` : "Sin evaluaciones en el periodo"}
          icono={ClipboardCheck}
          color="from-sky-500 to-cyan-400"
          progreso={r.puntajePromedio ?? 0}
          ayuda="Promedio del puntaje de las evaluaciones por competencias hechas dentro del rango. Apto desde 70 puntos."
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Postulaciones y contrataciones" subtitulo="Cuántas postulaciones llegaron y cuántas contrataciones se cerraron en el tiempo" className="lg:col-span-2">
          <SerieTemporal puntos={datos.serie} granularidad={datos.rango.granularidad} />
        </Tarjeta>
        <Tarjeta titulo="Embudo de selección" subtitulo="En qué etapa está hoy cada postulación del periodo">
          <EmbudoSeleccion embudo={datos.embudo} />
        </Tarjeta>
      </div>

      {/* Tablas */}
      <Tarjeta titulo="Rendimiento por empresa" subtitulo="Resumen que se puede presentar a cada cliente">
        <TablaEmpresas filas={datos.porEmpresa} />
      </Tarjeta>

      <Tarjeta titulo="Detalle por vacante" subtitulo="Postulaciones y avance de cada anuncio. La cobertura cuenta los contratados de todo el tiempo">
        <TablaAnuncios filas={datos.porAnuncio} mostrarEmpresa={mostrarEmpresa} />
      </Tarjeta>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Competencias evaluadas" subtitulo="Promedio de las evaluaciones del periodo (escala 1 a 5)">
          <CompetenciasBarras competencias={datos.competencias} />
        </Tarjeta>
        <Tarjeta titulo="Actividad reciente" subtitulo="Últimos cambios de etapa del periodo">
          <ListaActividad actividad={datos.actividad} nombres={nombres} />
        </Tarjeta>
      </div>
    </div>
  );
}

export function DashboardView() {
  const hoy = useSyncExternalStore(suscribir, hoyDelNavegador, hoyDelServidor);
  if (hoy === "") {
    return <div className="mx-auto w-full max-w-7xl p-6 md:p-8"><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /></div>;
  }
  return <DashboardContenido hoy={hoy} />;
}

function DashboardContenido({ hoy }: { hoy: string }) {
  // Por defecto: los últimos 30 días, todas las empresas que el usuario puede ver.
  const [filtros, setFiltros] = useState<Filtros>({ desde: sumarDias(hoy, -29), hasta: hoy, empresaId: null });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const { datos, nombres, cargando, error } = useDashboard(filtros);

  // Las empresas del filtro salen de la base de datos (solo las que el usuario puede ver).
  useEffect(() => {
    let cancelado = false;
    fetchEmpresas()
      .then((lista) => {
        if (!cancelado) setEmpresas(lista);
      })
      .catch(() => {
        // Sin lista, el filtro solo ofrece "Todas".
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cambiarFiltros = (cambios: Partial<Filtros>) => setFiltros((previo) => ({ ...previo, ...cambios }));

  const empresaElegida = empresas.find((e) => e.id === filtros.empresaId);
  const nombreEmpresa = empresaElegida?.razonSocial ?? (empresas.length > 1 ? "Todas las empresas" : empresas[0]?.razonSocial ?? "Todas las empresas");
  const r = datos?.resumen;
  const rangoTexto = `${formatoCompleto(filtros.desde)} al ${formatoCompleto(filtros.hasta)}`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard Principal</h1>
        <p className="mt-1 text-slate-500">
          Indicadores de reclutamiento y selección · <span className="font-medium text-slate-600">{nombreEmpresa}</span> · {rangoTexto}
        </p>
        <p className="mt-1 hidden text-xs text-slate-400 print:block">Reporte generado el {new Date().toLocaleString("es-PE")}</p>
      </div>

      <FiltrosDashboard
        filtros={filtros}
        hoy={hoy}
        empresas={empresas}
        cargando={cargando}
        puedeExportar={datos !== null && filtros.desde <= filtros.hasta}
        onCambiar={cambiarFiltros}
        onExportar={() => datos && descargarReporteCsv(datos, nombreEmpresa)}
        onImprimir={() => window.print()}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">{error}</div>
      )}

      {!datos || !r ? (
        !error && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )
      ) : (
        <div className={`transition-opacity ${cargando ? "opacity-60" : ""}`}>
          <IndicadoresDashboard datos={datos} nombres={nombres} mostrarEmpresa={filtros.empresaId === null} />
        </div>
      )}
    </div>
  );
}
