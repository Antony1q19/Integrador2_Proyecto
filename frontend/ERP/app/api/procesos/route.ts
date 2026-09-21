// app/api/procesos/route.ts
//
// Postulaciones (un postulante en un anuncio, con su etapa):
//   GET  /api/procesos?postulanteId=...  → en qué anuncios postuló y en qué etapa va
//   POST /api/procesos                   → registrar que se presentó a un anuncio
// Reenvía al Gateway con el JWT de la cookie httpOnly.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // `search` incluye el "?postulanteId=..." tal como llegó.
  const respuesta = await reenviarAlGateway(token, `/procesos${request.nextUrl.search}`);
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, "/procesos", { method: "POST", body: cuerpoPeticion });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
