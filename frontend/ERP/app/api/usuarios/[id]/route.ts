// app/api/usuarios/[id]/route.ts — editar datos de un trabajador (Admin).
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, `/usuarios/${id}`, { method: "PATCH", body: cuerpoPeticion });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
