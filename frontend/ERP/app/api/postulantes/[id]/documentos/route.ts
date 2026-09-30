// app/api/postulantes/[id]/documentos/route.ts
//
// Documentos (CV, DNI, imágenes...) de un postulante:
//   GET  → lista
//   POST → sube un archivo NUEVO (multipart). Los archivos se guardan en Supabase Storage (bucket privado);
//          la subida la hace el backend (servicio-postulantes), que es quien tiene
//          las claves — acá solo se reenvía el archivo tal cual, con el JWT de la
//          cookie httpOnly (ver app/api/postulantes/[id]/route.ts).
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const respuesta = await reenviarAlGateway(token, `/postulantes/${encodeURIComponent(id)}/documentos`);
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // El cuerpo se reenvía SIN tocarlo, junto con su Content-Type (que incluye el
  // "boundary" que separa los campos del formulario; si se perdiera, el backend
  // no podría leer el archivo).
  const cuerpoPeticion = await request.arrayBuffer();
  const respuesta = await reenviarAlGateway(token, `/postulantes/${encodeURIComponent(id)}/documentos/archivo`, {
    method: "POST",
    body: cuerpoPeticion,
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  });
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
