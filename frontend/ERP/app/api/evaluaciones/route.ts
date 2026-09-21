// app/api/evaluaciones/route.ts
//
// Evaluaciones por competencias de un postulante:
//   GET  /api/evaluaciones?postulanteId=...  → sus evaluaciones
//   POST /api/evaluaciones                   → registrar una (el puntaje y el resultado los calcula el backend)
// Reenvía al Gateway con el JWT de la cookie httpOnly.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, `/evaluaciones${request.nextUrl.search}`);
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, "/evaluaciones", { method: "POST", body: cuerpoPeticion });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
