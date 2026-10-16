// lib/ipCliente.ts
//
// El navegador nunca llama al Gateway directo: llama a este servidor de Next.js y este llama
// al Gateway. Por eso, para el Gateway, TODAS las peticiones vienen de la misma IP (la de este
// servidor), y sus límites por IP (ej. bloqueo tras 5 contraseñas incorrectas) castigarían a
// todos los usuarios a la vez.
//
// Estas cabeceras le pasan al Gateway la IP real del usuario. Van junto con una clave compartida
// (FRONTEND_PROXY_SECRET, la misma que en backend/gateway/.env): el Gateway solo cree la IP si la
// clave coincide, así nadie puede inventarse una IP llamando directo al puerto del Gateway.
// Ver backend/gateway/app/core/limite_peticiones.py.
//
// ¿De dónde sale la IP? En AWS, CloudFront agrega "CloudFront-Viewer-Address" (ip:puerto) con la IP
// REAL de quien se conecta: el usuario no puede inventarla. Si no está (desarrollo local), se usa
// X-Forwarded-For, que en la PC completa el propio Next.js.
import type { NextRequest } from 'next/server';

const SECRETO_PROXY = process.env.FRONTEND_PROXY_SECRET;

export function cabecerasIpCliente(request: NextRequest): Record<string, string> {
  if (!SECRETO_PROXY) return {};
  const ip =
    ipDeCloudFront(request.headers.get('cloudfront-viewer-address')) ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    '';
  if (!ip) return {};
  return { 'X-Cliente-IP': ip, 'X-Proxy-Secret': SECRETO_PROXY };
}

// '203.0.113.5:44321' o '2001:db8::1:44321' → la IP sin el puerto (lo que va después del último ':').
function ipDeCloudFront(valor: string | null): string {
  if (!valor) return '';
  const corte = valor.lastIndexOf(':');
  return (corte > 0 ? valor.slice(0, corte) : valor).trim();
}
