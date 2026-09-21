// app/api/dashboard/route.ts
//
// GET → indicadores del Dashboard, desde servicio-procesos-seleccion (a través del Gateway).
// Query: desde, hasta (AAAA-MM-DD) y empresaId. El backend aplica el filtro de empresas del usuario
// (un Admin ve todas; RRHH y Supervisor solo las asignadas): esta ruta solo reenvía.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, `/dashboard${request.nextUrl.search}`);
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
