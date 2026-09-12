// app/api/auth/login/route.ts
//
// Único lugar del ERP donde el JWT del Gateway pasa por manos del
// servidor de Next.js. El navegador NUNCA lo recibe en el body de la
// respuesta ni en JavaScript -se lo asigna acá mismo como cookie httpOnly,
// así un XSS en el front no puede robarlo con `document.cookie`-.
//
// Corre server-side (dentro del contenedor "erp-service"), por eso usa
// GATEWAY_INTERNAL_URL (nombre del contenedor en la red de Docker), no
// NEXT_PUBLIC_API_URL (esa es para el navegador, que no está en esa red).
import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;
const ROLES_VALIDOS_ERP = ["Admin", "RRHH", "Supervisor"];

// Debe coincidir con JWT_MINUTOS_EXPIRACION del Gateway (backend/gateway/.env).
// Si el JWT expira antes, el Gateway igual lo rechaza (401) aunque la
// cookie siga viva; esto solo evita mandar una cookie "vencida" de más.
const DURACION_COOKIE_SEGUNDOS = 60 * 60;

export async function POST(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { error: "GATEWAY_INTERNAL_URL no está configurada en el servidor" },
      { status: 500 }
    );
  }

  const { email, password } = await request.json();

  const respuestaGateway = await fetch(`${GATEWAY_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!respuestaGateway.ok) {
    // Se reenvía el mensaje real del Gateway (ej. "Tu cuenta está
    // suspendida...", distinto de "Credenciales inválidas") en vez de
    // aplanar todo a un mismo error genérico.
    const cuerpoError = await respuestaGateway.json().catch(() => null);
    return NextResponse.json(
      { error: cuerpoError?.detail ?? "Credenciales inválidas" },
      { status: respuestaGateway.status }
    );
  }

  const { access_token, rol, nombre, email: emailUsuario, empresasVisibles } = await respuestaGateway.json();
  if (!ROLES_VALIDOS_ERP.includes(rol)) {
    return NextResponse.json({ error: "Esta cuenta no tiene acceso al ERP" }, { status: 403 });
  }

  // Se devuelve rol/nombre/email/empresasVisibles al cliente (para las
  // cookies de UI userRole/userName/... que usan middleware.ts y la
  // pantalla de empresas) -el access_token nunca sale de este endpoint
  // hacia el body de la respuesta-.
  const respuesta = NextResponse.json({ rol, nombre, email: emailUsuario, empresasVisibles });
  respuesta.cookies.set("authToken", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_COOKIE_SEGUNDOS,
  });
  return respuesta;
}
