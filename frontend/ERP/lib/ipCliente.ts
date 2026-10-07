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
// Nota: la IP se toma de X-Forwarded-For, que Next.js completa con la IP de la conexión. En
// producción, el proxy de entrada (nginx, el balanceador...) debe sobrescribir esa cabecera para
// que un cliente no pueda falsificarla.
import type { NextRequest } from "next/server";

const SECRETO_PROXY = process.env.FRONTEND_PROXY_SECRET;

export function cabecerasIpCliente(request: NextRequest): Record<string, string> {
  if (!SECRETO_PROXY) return {};
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  if (!ip) return {};
  return { "X-Cliente-IP": ip, "X-Proxy-Secret": SECRETO_PROXY };
}
