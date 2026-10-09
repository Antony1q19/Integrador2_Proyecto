// app/api/comunicaciones/route.ts
//
// Proxy al Gateway para las conversaciones de WhatsApp.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

export async function GET() {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'GATEWAY_INTERNAL_URL no configurada' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const respuesta = await fetch(`${GATEWAY_URL}/comunicaciones/conversaciones`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    const data = await respuesta.json().catch(() => []);
    return NextResponse.json(data, { status: respuesta.status });
  } catch (error) {
    console.error('Error al listar conversaciones:', error);
    return NextResponse.json({ error: 'Error al listar conversaciones' }, { status: 500 });
  }
}