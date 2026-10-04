import { NextRequest, NextResponse } from 'next/server';
import { reenviarAlGateway } from '@/lib/gatewayProxy';
import { cookies } from 'next/headers';

export async function PATCH(req: NextRequest) {
  try {
    const cuerpo = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ detail: 'No autorizado' }, { status: 401 });
    }

    const respuesta = await reenviarAlGateway('/publico/auth/perfil', {
      method: 'PATCH',
      body: JSON.stringify(cuerpo),
    }, token);

    const data = await respuesta.json().catch(() => ({}));

    return NextResponse.json(data, { status: respuesta.status });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
