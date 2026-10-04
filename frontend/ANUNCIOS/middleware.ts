// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function destinoSeguro(siguiente: string | null, destinoPorDefecto = '/perfil'): string {
  if (
    siguiente &&
    siguiente.startsWith('/') &&
    !siguiente.startsWith('//') &&
    !siguiente.startsWith('/\\')
  ) {
    return siguiente;
  }
  return destinoPorDefecto;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const { pathname, search } = request.nextUrl;

  const esRutaProtegida =
    pathname.startsWith('/perfil') || pathname.startsWith('/his_postulaciones');
  const esRutaAuth = pathname.startsWith('/login') || pathname.startsWith('/registro');

  // 1. Si no tiene sesión e intenta entrar a una ruta protegida -> redirigir al login
  if (!token && esRutaProtegida) {
    const siguiente = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/login?siguiente=${siguiente}`, request.url));
  }

  // 2. Si ya tiene sesión e intenta entrar al login o registro -> redirigir al destino seguro
  if (token && esRutaAuth) {
    const siguienteParam = request.nextUrl.searchParams.get('siguiente');
    const destino = destinoSeguro(siguienteParam, '/perfil');
    return NextResponse.redirect(new URL(destino, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Aplicar middleware solo a rutas de páginas, excluyendo estáticos y APIs
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
