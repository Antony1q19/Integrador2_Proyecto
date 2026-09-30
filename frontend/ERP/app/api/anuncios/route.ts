// app/api/anuncios/route.ts
//
// GET  → lista de anuncios que el usuario puede ver, desde servicio-empresas-vacantes. Un Admin ve todos;
//        RRHH y Supervisor solo los de las empresas que un Admin les asignó.
// POST → crea un nuevo anuncio (Admin, RRHH). Nace siempre en estado "Abierto" (lo asigna el backend).
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

export async function POST(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const cuerpoPeticion = await request.text();
  const respuesta = await reenviarAlGateway(token, "/anuncios", {
    method: "POST",
    body: cuerpoPeticion,
  });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}