// features/dashboard/utils/exportarCsv.ts
//
// Descarga el reporte como CSV (se abre directo en Excel): indicadores, rendimiento por empresa y
// detalle por vacante. El BOM del inicio hace que Excel muestre bien las tildes y la eñe.
import { DashboardDatos } from "../types/dashboard";
import { formatoCompleto } from "./fechas";

// Escapa un valor para CSV: si tiene coma, comillas o salto de línea, va entre comillas.
function celda(valor: string | number | null): string {
  const texto = valor === null ? "" : String(valor);
  return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const fila = (valores: (string | number | null)[]) => valores.map(celda).join(",");

export function descargarReporteCsv(datos: DashboardDatos, nombreEmpresa: string): void {
  const r = datos.resumen;
  const lineas = [
    fila(["Reporte de reclutamiento"]),
    fila(["Empresa", nombreEmpresa]),
    fila(["Periodo", `${formatoCompleto(datos.rango.desde)} al ${formatoCompleto(datos.rango.hasta)}`]),
    "",
    fila(["INDICADORES"]),
    fila(["Postulaciones recibidas", r.postulaciones]),
    fila(["Postulantes únicos", r.postulantesUnicos]),
    fila(["En proceso", r.enProceso]),
    fila(["Contratados", r.contratados]),
    fila(["Descartados", r.descartados]),
    fila(["Tasa de contratación (%)", r.tasaContratacion]),
    fila(["Tasa de descarte (%)", r.tasaDescarte]),
    fila(["Días promedio para contratar", r.diasPromedioContratacion]),
    fila(["Anuncios activos", r.anunciosActivos]),
    fila(["Vacantes activas", r.vacantesActivas]),
    fila(["Vacantes cubiertas", r.vacantesCubiertas]),
    fila(["Cobertura de vacantes (%)", r.coberturaVacantes]),
    fila(["Evaluaciones realizadas", r.evaluaciones]),
    fila(["Puntaje promedio", r.puntajePromedio]),
    fila(["Evaluados aptos (%)", r.porcentajeApto]),
    "",
    fila(["RENDIMIENTO POR EMPRESA"]),
    fila(["Empresa", "Anuncios activos", "Vacantes", "Postulaciones", "En proceso", "Contratados", "Tasa de contratación (%)"]),
    ...datos.porEmpresa.map((e) =>
      fila([e.razonSocial, e.anunciosActivos, e.vacantes, e.postulaciones, e.enProceso, e.contratados, e.tasaContratacion])
    ),
    "",
    fila(["DETALLE POR VACANTE"]),
    fila(["Vacante", "Empresa", "Estado", "Vacantes", "Postulaciones", "En proceso", "Contratados (periodo)", "Contratados (total)", "Cobertura (%)"]),
    ...datos.porAnuncio.map((a) =>
      fila([a.cargo, a.empresaRazonSocial, a.estado, a.vacantes, a.postulaciones, a.enProceso, a.contratados, a.contratadosTotal, a.cobertura])
    ),
  ];

  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `reporte-reclutamiento_${datos.rango.desde}_${datos.rango.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}
