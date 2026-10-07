// lib/usePermisos.ts — los permisos del usuario con sesión (ver la matriz en lib/permisos.ts).
"use client";

import { permisosDe, type Permisos } from "./permisos";
import { useCookieValue } from "./useCookieValue";

export function usePermisos(): Permisos {
  return permisosDe(useCookieValue("userRole"));
}
