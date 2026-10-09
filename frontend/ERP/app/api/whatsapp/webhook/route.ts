import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET ?? 'mi-secreto-de-prueba';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature') ?? '';

  // Verificar la firma HMAC
  const esperada = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (signature !== esperada) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  console.log('📩 Webhook recibido:', payload.event);

  // TODO: guardar en base de datos o reenviar al backend
  return NextResponse.json({ ok: true });
}