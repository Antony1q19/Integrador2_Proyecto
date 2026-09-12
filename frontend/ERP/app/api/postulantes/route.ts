// app/api/postulantes/route.ts
//
// Proxy server-side entre el navegador y el Gateway: el navegador le pide
// el listado a ESTE endpoint (mismo origen, sin token visible); acá se
// lee el JWT de la cookie httpOnly (el navegador la manda sola, JS no
// necesita tocarla) y recién ahí se arma el `Authorization: Bearer` hacia
// el Gateway real. Así el token nunca queda expuesto a JavaScript del
// cliente en ningún punto del flujo.
import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!GATEWAY_URL) {
    return NextResponse.json(
      { error: "GATEWAY_INTERNAL_URL no está configurada en el servidor" },
      { status: 500 }
    );
  }

  const respuestaGateway = await fetch(`${GATEWAY_URL}/postulantes`, {
    headers: { Authorization: `Bearer ${token}` },
    // Sin caché: la lista de postulantes puede cambiar entre requests.
    cache: "no-store",
  });

  const cuerpo = await respuestaGateway.text();
  return new NextResponse(cuerpo, {
    status: respuestaGateway.status,
    headers: { "Content-Type": "application/json" },
  });
}
