// lib/csrf.ts
//
// Protección CSRF para las rutas /api del ERP (la aplica middleware.ts a todo lo que modifica datos:
// POST, PUT, PATCH, DELETE). La cookie de sesión ya es SameSite=Lax; además se exige que la petición
// venga de una página de ESTE mismo sitio (cabeceras Sec-Fetch-Site / Origin que pone el navegador).
// Misma regla que frontend/ANUNCIOS/lib/csrf.ts.
import type { NextRequest } from "next/server";

export function esOrigenValido(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
    return false;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  return true;
}
