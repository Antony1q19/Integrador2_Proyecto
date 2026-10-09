// app/api/comunicaciones/[id]/mensajes/route.ts
//
// Lista o envía mensajes de una conversación.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

async function reenviarAlGateway(ruta: string, init?: RequestInit) {
  if (!GATEWAY_URL) {
    throw new Error('GATEWAY_INTERNAL_URL no está configurada');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return fetch(`${GATEWAY_URL}${ruta}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const respuesta = await reenviarAlGateway(`/comunicaciones/conversaciones/${id}/mensajes`);
    const data = await respuesta.json().catch(() => []);
    return NextResponse.json(data, { status: respuesta.status });
  } catch (error) {
    console.error('Error al listar mensajes:', error);
    return NextResponse.json({ error: 'Error al listar mensajes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const cuerpo = await request.json();
    const respuesta = await reenviarAlGateway(`/comunicaciones/conversaciones/${id}/mensajes`, {
      method: 'POST',
      body: JSON.stringify(cuerpo),
    });
    const data = await respuesta.json().catch(() => ({}));
    return NextResponse.json(data, { status: respuesta.status });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
  }
}