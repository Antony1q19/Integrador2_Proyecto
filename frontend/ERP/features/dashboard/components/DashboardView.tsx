// features/dashboard/components/DashboardView.tsx
//
// Dashboard principal: indicadores de operación y de presentación a las empresas, con filtro por
// empresa y por rango de fechas. Todos los datos salen de la base de datos (GET /dashboard); cada
// persona ve solo las empresas que tiene asignadas (un Admin ve todas).
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
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
import { formatoFecha, formatoFechaHora } from "@/lib/fechasLima";
import { FiltrosDashboard } from "./FiltrosDashboard";
import { KpiCard } from "./KpiCard";
import { EmbudoSeleccion } from "./EmbudoSeleccion";
import { SerieTemporal } from "./SerieTemporal";
import { CompetenciasBarras, ListaActividad, TablaAnuncios, TablaEmpresas } from "./TablasDashboard";
import { DashboardSkeleton, TarjetasDashboardSkeleton } from "./DashboardSkeleton";

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

      {/* Entrevistas y seguimiento post-ingreso */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="Entrevistas de hoy"
          valor={String(r.entrevistasHoy)}
          detalle={`${r.entrevistasProximas} en los próximos 7 días`}
          icono={CalendarClock}
          color="from-cyan-500 to-blue-500"
          ayuda="Entrevistas programadas (foto de hoy, no depende del rango de fechas)."
        />
        <KpiCard
          titulo="Entrevistas realizadas"
          valor={String(r.entrevistasRealizadas)}
          detalle="Dentro del rango de fechas"
          icono={ClipboardCheck}
          color="from-teal-500 to-emerald-400"
        />
        <KpiCard
          titulo="Ingresos por iniciar"
          valor={String(r.ingresosPorIniciar)}
          detalle="Contratados que aún no ingresan"
          icono={BadgeCheck}
          color="from-lime-500 to-green-500"
        />
        <KpiCard
          titulo="Controles post-ingreso"
          valor={String(r.seguimientosPendientes)}
          detalle={r.seguimientosVencidos > 0 ? `${r.seguimientosVencidos} vencido${r.seguimientosVencidos === 1 ? "" : "s"}` : "Ninguno vencido"}
          icono={Hourglass}
          color={r.seguimientosVencidos > 0 ? "from-rose-500 to-pink-400" : "from-slate-400 to-slate-500"}
          ayuda="Controles a los 30, 60 y 90 días de personas contratadas que aún están pendientes."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Próximas entrevistas" subtitulo="Las siguientes entrevistas programadas">
          {datos.agenda.proximasEntrevistas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No hay entrevistas programadas.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {datos.agenda.proximasEntrevistas.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/postulantes/${e.postulanteId}`} className="truncate text-sm font-semibold text-slate-800 hover:underline">
                      {nombres[e.postulanteId] ?? "Postulante"}
                    </Link>
                    <p className="truncate text-xs text-slate-400">
                      {e.cargo} · {e.empresa}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <p className="font-medium text-slate-700">{formatoFechaHora(e.fechaHora)}</p>
                    <p>{e.modalidad}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta titulo="Controles post-ingreso por hacer" subtitulo="Seguimiento a las personas contratadas">
          {datos.agenda.seguimientosPorHacer.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No hay controles pendientes.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {datos.agenda.seguimientosPorHacer.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/postulantes/${s.postulanteId}`} className="truncate text-sm font-semibold text-slate-800 hover:underline">
                      {nombres[s.postulanteId] ?? "Postulante"}
                    </Link>
                    <p className="truncate text-xs text-slate-400">
                      Control a los {s.hitoDias} días · {s.cargo} · {s.empresa}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className={s.vencido ? "font-medium text-rose-600" : "font-medium text-slate-700"}>{formatoFecha(s.fechaProgramada)}</p>
                    {s.vencido && <p className="text-rose-500">Vencido</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
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
    return <DashboardSkeleton />;
  }
  return <DashboardContenido hoy={hoy} />;
}

function DashboardContenido({ hoy }: { hoy: string }) {
  // Por defecto: los últimos 30 días, todas las empresas que el usuario puede ver.
  const [filtros, setFiltros] = useState<Filtros>({ desde: sumarDias(hoy, -29), hasta: hoy, empresaId: null });
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const { datos, nombres, actualizando, error } = useDashboard(filtros);

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
        cargando={actualizando}
        puedeExportar={datos !== null && filtros.desde <= filtros.hasta}
        onCambiar={cambiarFiltros}
        onExportar={() => datos && descargarReporteCsv(datos, nombreEmpresa)}
        onImprimir={() => window.print()}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">{error}</div>
      )}

      {!datos || !r ? (
        !error && <TarjetasDashboardSkeleton />
      ) : (
        <div className={`transition-opacity ${actualizando ? "opacity-60" : ""}`}>
          <IndicadoresDashboard datos={datos} nombres={nombres} mostrarEmpresa={filtros.empresaId === null} />
        </div>
      )}
    </div>
  );
}
