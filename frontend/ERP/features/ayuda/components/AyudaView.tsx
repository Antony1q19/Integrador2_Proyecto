// features/ayuda/components/AyudaView.tsx
// Página "Ayuda": guía rápida por módulo, qué puede hacer cada rol y preguntas frecuentes, con buscador.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { usePermisos } from "@/lib/usePermisos";
import { PREGUNTAS_FRECUENTES, ROLES_AYUDA, SECCIONES_AYUDA } from "../contenidoAyuda";

const normalizar = (texto: string) =>
  texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function AyudaView() {
  const { rol } = usePermisos();
  const [busqueda, setBusqueda] = useState("");
  const q = normalizar(busqueda.trim());

  const secciones = useMemo(
    () =>
      q
        ? SECCIONES_AYUDA.filter((s) => normalizar([s.titulo, s.resumen, ...s.pasos].join(" ")).includes(q))
        : SECCIONES_AYUDA,
    [q]
  );
  const preguntas = useMemo(
    () =>
      q ? PREGUNTAS_FRECUENTES.filter((p) => normalizar(`${p.pregunta} ${p.respuesta}`).includes(q)) : PREGUNTAS_FRECUENTES,
    [q]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ayuda</h1>
        <p className="text-sm text-slate-500">Guía rápida de cada módulo del ERP y respuestas a dudas frecuentes.</p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <span className="sr-only">Buscar en la ayuda</span>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar: entrevista, WhatsApp, contraseña, documentos…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
      </label>

      {secciones.length === 0 && preguntas.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No encontramos nada sobre &quot;{busqueda}&quot;. Prueba con otra palabra.
        </p>
      )}

      {secciones.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Módulos</h2>
          {secciones.map((s) => (
            <details key={s.id} open={!!q} className="group rounded-xl border border-slate-100 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">{s.titulo}</p>
                  <p className="text-sm text-slate-500">{s.resumen}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                  {s.pasos.map((paso) => (
                    <li key={paso}>{paso}</li>
                  ))}
                </ol>
                {s.ruta && (
                  <Link
                    href={s.ruta}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Ir a {s.titulo} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </details>
          ))}
        </section>
      )}

      {!q && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Qué puede hacer cada rol</h2>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            {ROLES_AYUDA.map((r) => (
              <div
                key={r.rol}
                className={`flex gap-4 border-b border-slate-100 p-4 last:border-0 ${r.rol === rol ? "bg-primary-50" : ""}`}
              >
                <span className="w-24 shrink-0 text-sm font-semibold text-slate-900">
                  {r.rol}
                  {r.rol === rol && <span className="block text-[11px] font-normal text-primary-600">(tu rol)</span>}
                </span>
                <p className="text-sm text-slate-600">{r.puede}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {preguntas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preguntas frecuentes</h2>
          {preguntas.map((p) => (
            <details key={p.pregunta} open={!!q} className="group rounded-xl border border-slate-100 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-slate-900">
                {p.pregunta}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm text-slate-600">{p.respuesta}</p>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
