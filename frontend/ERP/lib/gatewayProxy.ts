// lib/gatewayProxy.ts
//
// Helper compartido por las rutas de app/api/**/route.ts que reenvían al
// Gateway. Cada route.ts sigue leyendo el JWT él mismo (de la cookie
// httpOnly "authToken", vía request.cookies -no puede leerse desde
// JavaScript del cliente-); esto solo evita repetir 6 veces el mismo
// fetch con el mismo header Authorization.
const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

export async function reenviarAlGateway(token: string, ruta: string, init?: RequestInit): Promise<Response> {
  if (!GATEWAY_URL) {
    throw new Error("GATEWAY_INTERNAL_URL no está configurada en el servidor");
  }
  return fetch(`${GATEWAY_URL}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}
