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

  if (respuesta.status === 204) {
    // Al cambiar la contraseña, el Gateway invalida TODOS los tokens emitidos antes (también el de
    // esta sesión): se cierra la sesión para que entre de nuevo con la contraseña nueva.
    const final = new NextResponse(null, { status: 204 });
    final.cookies.set("authToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    final.cookies.delete("cambioPassword");
    final.headers.set("X-Sesion-Cerrada", "1");
    return final;
  }
  const cuerpo = await respuesta.text();
  return new NextResponse(cuerpo, { status: respuesta.status, headers: { "Content-Type": "application/json" } });
}
