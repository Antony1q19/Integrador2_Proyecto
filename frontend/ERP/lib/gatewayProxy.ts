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
  const pedir = () =>
    fetch(`${GATEWAY_URL}${ruta}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

  try {
    return await pedir();
  } catch (error) {
    // A veces Node intenta reutilizar una conexión que el Gateway ya cerró por inactividad ("other side
    // closed") y la petición falla sin haber llegado a ningún lado. Si es una consulta (GET), es seguro
    // repetirla una vez sobre una conexión nueva. Lo que guarda datos (POST/PATCH/...) NO se repite.
    const metodo = (init?.method ?? "GET").toUpperCase();
    if (metodo === "GET" && error instanceof TypeError) return await pedir();
    throw error;
  }
}
