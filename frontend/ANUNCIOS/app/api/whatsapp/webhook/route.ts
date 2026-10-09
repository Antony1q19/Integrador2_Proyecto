// app/api/whatsapp/webhook/route.ts
//
// Recibe los webhooks del emulador de WhatsApp (o Meta en producción)
// y los reenvía al servicio-comunicaciones a través del Gateway.
import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_INTERNAL_URL;

export async function POST(request: NextRequest) {
  if (!GATEWAY_URL) {
    return NextResponse.json({ error: 'GATEWAY_INTERNAL_URL no configurada' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const firma = request.headers.get('x-webhook-signature') ?? '';

    // Reenviar al Gateway SIN token (los webhooks no llevan sesión de usuario)
    const respuesta = await fetch(`${GATEWAY_URL}/publico/webhook/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': firma,
      },
      body,
    });

    return NextResponse.json(await respuesta.json().catch(() => ({})), { status: respuesta.status });
  } catch (error) {
    console.error('Error al reenviar webhook:', error);
    return NextResponse.json({ error: 'Error al procesar webhook' }, { status: 500 });
  }
}