// app/api/postulantes/route.ts
//
// Proxy server-side entre el navegador y el Gateway: el navegador le pide
// el listado a ESTE endpoint (mismo origen, sin token visible); acá se
// lee el JWT de la cookie httpOnly (el navegador la manda sola, JS no
// necesita tocarla) y recién ahí se arma el `Authorization: Bearer` hacia
// el Gateway real. Así el token nunca queda expuesto a JavaScript del
// cliente en ningún punto del flujo.
import { NextRequest, NextResponse } from "next/server";

import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const respuestaGateway = await reenviarAlGateway(token, "/postulantes");

  const cuerpo = await respuestaGateway.text();
  return new NextResponse(cuerpo, {
    status: respuestaGateway.status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST → registra un postulante nuevo (el formulario "Nuevo postulante"). Se reenvía al
// Gateway con el JWT de la cookie; el backend decide si se acepta (rol, duplicados...) y
// responde con el postulante creado o con el motivo del rechazo (409 si ya existe).
export async function POST(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const respuesta = await reenviarAlGateway(token, "/postulantes", {
    method: "POST",
    body: await request.text(),
  });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
