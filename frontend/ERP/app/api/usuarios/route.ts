// app/api/usuarios/route.ts — listar (GET) y crear (POST) trabajadores.
// Solo Admin puede llegar acá de verdad: el Gateway (servicio dueño de
// gateway_db.usuarios) es quien lo exige con requerir_rol("Admin"); acá
// solo se reenvía la petición ya autenticada.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, "/usuarios");
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, "/usuarios", { method: "POST", body: cuerpoPeticion });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
