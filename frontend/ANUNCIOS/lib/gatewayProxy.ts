// lib/gatewayProxy.ts
//
// Helper compartido por las rutas de app/api/auth/**/route.ts que reenvían al Gateway.
// Gestiona la conexión interna con el Gateway, el reintento seguro en GET y las cabeceras.

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

export async function reenviarAlGateway(
  ruta: string,
  init?: RequestInit,
  token?: string
): Promise<Response> {
  if (!GATEWAY_URL) {
    throw new Error('GATEWAY_INTERNAL_URL no está configurada en el servidor de ANUNCIOS');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const pedir = () =>
    fetch(`${GATEWAY_URL}${ruta}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

  try {
    return await pedir();
  } catch (error) {
    // Si la conexión previa cerró por inactividad y la petición es GET, se reintenta una vez
    const metodo = (init?.method ?? 'GET').toUpperCase();
    if (metodo === 'GET' && error instanceof TypeError) {
      return await pedir();
    }
    throw error;
  }
}
