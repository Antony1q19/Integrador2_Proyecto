// lib/cacheCliente.ts
//
// Memoria del NAVEGADOR para que las pantallas se sientan rápidas. La base de datos está en la nube y
// cada consulta tarda unos cientos de milisegundos; con esta memoria:
//   - Al volver a una pantalla ya visitada (ej. Postulantes -> ficha -> Postulantes) se muestran AL INSTANTE
//     los datos de la vez anterior y, en segundo plano, se piden los nuevos ("stale-while-revalidate").
//   - Si dos componentes piden lo mismo a la vez (ej. empresas), se hace UNA sola petición.
//
// Ojo: solo vive mientras la pestaña esté abierta y se BORRA al iniciar o cerrar sesión (los datos de una
// persona nunca deben verse en la sesión de otra).
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface Entrada {
  datos: unknown;
  guardadoEn: number; // 0 = "vencido": se muestra igual, pero la próxima vez se vuelve a pedir
}

const memoria = new Map<string, Entrada>();
const enCurso = new Map<string, Promise<unknown>>();
const oyentes = new Set<() => void>();

const avisar = () => oyentes.forEach((oyente) => oyente());

export function leerCache<T>(clave: string): T | undefined {
  return memoria.get(clave)?.datos as T | undefined;
}

export function guardarCache<T>(clave: string, datos: T): void {
  memoria.set(clave, { datos, guardadoEn: Date.now() });
  avisar();
}

// Cambia lo que hay guardado sin volver a pedirlo (ej. mover una tarjeta del pipeline ya confirmada).
export function actualizarCache<T>(clave: string, transformar: (actual: T) => T): void {
  const actual = memoria.get(clave);
  if (actual) {
    memoria.set(clave, { datos: transformar(actual.datos as T), guardadoEn: actual.guardadoEn });
    avisar();
  }
}

// Marca como vencido todo lo guardado cuyo nombre empiece con `prefijo`: se seguirá mostrando mientras
// llegan los datos nuevos (así nunca se ve la pantalla en blanco), pero se volverá a pedir. Se usa después
// de guardar cambios (crear un postulante, mover una etapa...).
export function marcarVencido(prefijo: string): void {
  for (const [clave, entrada] of memoria) {
    if (clave.startsWith(prefijo)) entrada.guardadoEn = 0;
  }
}

// Borra TODO. Se llama al iniciar/cerrar sesión.
export function vaciarCache(): void {
  memoria.clear();
  enCurso.clear();
  avisar();
}

// Pide los datos (una sola petición aunque varios los pidan a la vez) y los guarda.
export function cargarYGuardar<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente as Promise<T>;

  const promesa = cargar()
    .then((datos) => {
      guardarCache(clave, datos);
      return datos;
    })
    .finally(() => enCurso.delete(clave));
  enCurso.set(clave, promesa);
  return promesa;
}

// Devuelve lo guardado si es reciente; si no, lo pide. Para funciones que devuelven una promesa.
export function cargarConCache<T>(clave: string, cargar: () => Promise<T>, vigenciaMs = 30_000): Promise<T> {
  const entrada = memoria.get(clave);
  if (entrada && Date.now() - entrada.guardadoEn < vigenciaMs) return Promise.resolve(entrada.datos as T);
  return cargarYGuardar(clave, cargar);
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};
const sinDatosEnServidor = () => undefined;

interface ResultadoCarga<T> {
  datos: T | undefined; // lo último que se tiene (puede ser de la vez anterior)
  cargando: boolean; // true SOLO si todavía no hay nada que mostrar
  actualizando: boolean; // true si ya se muestra algo pero se están pidiendo datos nuevos
  error: string | null;
  recargar: () => Promise<void>;
}

// Hook para pantallas que cargan datos: muestra al instante lo guardado (si hay) y se actualiza solo.
// `frescoMs`: si lo guardado tiene menos de este tiempo, no se vuelve a pedir al entrar.
export function useCargaConCache<T>(clave: string, cargar: () => Promise<T>, frescoMs = 5_000): ResultadoCarga<T> {
  const datos = useSyncExternalStore(suscribir, () => leerCache<T>(clave), sinDatosEnServidor);
  // Resultado de la última petición: para qué clave terminó y con qué error (si lo hubo).
  const [terminada, setTerminada] = useState<{ clave: string; error: string | null } | null>(null);
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });

  useEffect(() => {
    let cancelado = false;
    const entrada = memoria.get(clave);
    const esReciente = entrada !== undefined && Date.now() - entrada.guardadoEn < frescoMs;
    const trabajo = esReciente ? Promise.resolve() : cargarYGuardar(clave, () => cargarRef.current()).then(() => undefined);

    trabajo
      .then(() => {
        if (!cancelado) setTerminada({ clave, error: null });
      })
      .catch((e) => {
        if (!cancelado) setTerminada({ clave, error: e instanceof Error ? e.message : "No se pudieron cargar los datos" });
      });
    return () => {
      cancelado = true;
    };
  }, [clave, frescoMs]);

  const finalizo = terminada?.clave === clave;
  const error = finalizo ? terminada.error : null;
  return {
    datos,
    cargando: datos === undefined && !error,
    actualizando: !finalizo && datos !== undefined,
    error: datos === undefined ? error : null, // si ya hay algo que mostrar, un fallo al refrescar no lo tapa
    recargar: async () => {
      try {
        await cargarYGuardar(clave, () => cargarRef.current());
        setTerminada({ clave, error: null });
      } catch (e) {
        setTerminada({ clave, error: e instanceof Error ? e.message : "No se pudieron cargar los datos" });
      }
    },
  };
}
