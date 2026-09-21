// app/api/empresas/route.ts
//
// GET → lista de empresas que el usuario puede ver, desde servicio-empresas-vacantes. Un Admin ve todas;
// RRHH y Supervisor solo las que un Admin les asignó (el filtro lo aplica el backend, no esta ruta).
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, "/empresas");
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
