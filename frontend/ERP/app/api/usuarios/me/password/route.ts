// app/api/usuarios/me/password/route.ts — cualquier usuario autenticado
// cambia SU PROPIA contraseña (no requiere rol Admin).
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, "/usuarios/me/password", {
    method: "PATCH",
    body: cuerpoPeticion,
  });

  if (respuesta.status === 204) return new NextResponse(null, { status: 204 });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
