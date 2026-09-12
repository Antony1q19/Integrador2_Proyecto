// app/api/auth/logout/route.ts
//
// Borra la cookie httpOnly del JWT. Tiene que ser el servidor quien la
// borre -JavaScript del cliente no puede tocar una cookie httpOnly,
// ni para leerla ni para borrarla-.
import { NextResponse } from "next/server";

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return respuesta;
}
