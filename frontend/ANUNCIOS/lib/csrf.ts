// lib/csrf.ts
//
// Verificación de origen para peticiones que modifican estado (POST).
// Complementa SameSite=Lax verificando Origin, Host y Sec-Fetch-Site.
import { NextRequest } from 'next/server';

export function esOrigenValido(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return false;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host) {
    try {
      const urlOrigen = new URL(origin);
      if (urlOrigen.host !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
