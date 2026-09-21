// app/api/anuncios/route.ts
//
// GET → lista de anuncios (con el nombre de su empresa), desde servicio-empresas-vacantes.
// Reenvía al Gateway con el JWT de la cookie httpOnly.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, "/anuncios");
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
