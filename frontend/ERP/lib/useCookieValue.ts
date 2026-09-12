// lib/useCookieValue.ts
//
// Lee una cookie de forma síncrona con useSyncExternalStore, en vez de
// useEffect + setState (mismo motivo que ya resolvió
// app/(dashboard)/layout.tsx: evita el render en cascada que marca la
// regla react-hooks/set-state-in-effect, y no desincroniza el HTML de
// servidor -que no tiene document.cookie- del cliente).
"use client";

import { useSyncExternalStore } from "react";

function leerCookie(nombre: string): string {
  if (typeof document === "undefined") return "";
  const valor = `; ${document.cookie}`;
  const partes = valor.split(`; ${nombre}=`);
  if (partes.length === 2) return partes.pop()?.split(";").shift() ?? "";
  return "";
}

function sinSuscripcion() {
  // Las cookies de sesión no emiten eventos de cambio dentro de la misma
  // pestaña, así que no hay nada a lo que suscribirse.
  return () => {};
}

export function useCookieValue(nombre: string, valorPorDefectoServidor = ""): string {
  return useSyncExternalStore(
    sinSuscripcion,
    () => leerCookie(nombre),
    () => valorPorDefectoServidor
  );
}
