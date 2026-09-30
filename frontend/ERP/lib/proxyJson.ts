// lib/proxyJson.ts
//
// Reenvía una petición del navegador al Gateway y devuelve su respuesta tal cual. Lo usan las rutas
// app/api/**/route.ts que solo "pasan" datos (entrevistas, contrataciones, seguimientos...): el navegador
// llama a ESTA ruta del ERP, que lee el JWT de la cookie httpOnly "authToken" (JavaScript no puede verla) y
// arma el `Authorization` hacia el Gateway. El token nunca sale al navegador.
import { NextRequest, NextResponse } from "next/server";
import { reenviarAlGateway } from "@/lib/gatewayProxy";

export async function reenviarPeticion(request: NextRequest, rutaGateway: string): Promise<NextResponse> {
  const token = request.cookies.get("authToken")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const conCuerpo = request.method !== "GET" && request.method !== "HEAD";
  const respuesta = await reenviarAlGateway(token, rutaGateway, {
    method: request.method,
    body: conCuerpo ? await request.text() : undefined,
  });
  const cuerpo = await respuesta.text();
  // Un 204 (sin contenido) no puede llevar cuerpo.
  return new NextResponse(respuesta.status === 204 ? null : cuerpo, {
    status: respuesta.status,
    headers: { "Content-Type": "application/json" },
  });
}
