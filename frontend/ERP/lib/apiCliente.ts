// lib/apiCliente.ts
//
// Utilidades comunes de las pantallas (código que corre en el NAVEGADOR) para hablar con las
// rutas /api/... del ERP.

import { vaciarCache } from "@/lib/cacheCliente";

// La sesión venció (el token dura 1 hora): se borran las cookies de pantalla y se manda al
// login, en vez de dejar la pantalla mostrando un error. Devuelve el mensaje para el `throw`.
export function sesionVencida(): string {
  vaciarCache();
  if (typeof document !== "undefined") {
    for (const nombre of ["userRole", "userName", "userEmail", "userEmpresas"]) {
      document.cookie = `${nombre}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    // Recarga completa (no router.push) a propósito: así se descarta todo el estado en memoria.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  return "Tu sesión venció. Vuelve a iniciar sesión.";
}

// Saca el mensaje de error que devolvió el servidor (el backend responde
// {"detail": "..."}, las rutas propias del ERP {"error": "..."}); si no hay
// ninguno legible, usa el mensaje por defecto.
export async function mensajeDeError(res: Response, porDefecto: string): Promise<string> {
  const cuerpo = await res.json().catch(() => null);
  const detalle = cuerpo?.detail ?? cuerpo?.error;
  if (typeof detalle === "string") return detalle;
  // Errores de validación (422): FastAPI manda una lista con un "msg" por cada campo mal enviado.
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle.map((d: { msg?: string }) => d.msg).filter(Boolean).join(". ") || porDefecto;
  }
  return porDefecto;
}
