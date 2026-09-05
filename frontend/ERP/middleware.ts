// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value;
  const { pathname } = request.nextUrl;
  
  // 1. Si no hay sesión y no está en /login, redirigir al login
  if (!role && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si ya hay sesión e intenta entrar al /login, mandarlo a su perfil
  if (role && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/perfil', request.url));
  }

  // 3. RUTAS PROTEGIDAS SEGÚN ROL (Ejemplo de reglas)
  if (role) {
    // Si es Supervisor, prohibirle entrar a /empresas o /anuncios
    if (role === 'Supervisor' && (pathname.startsWith('/empresas') || pathname.startsWith('/anuncios'))) {
      return NextResponse.redirect(new URL('/perfil', request.url));
    }

    // Si es RRHH, prohibirle entrar a la configuración de sistema (ejemplo /dashboard global)
    if (role === 'RRHH' && pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/postulantes', request.url));
    }
  }
 
  return NextResponse.next();
}
 
export const config = {
  // Proteger todo excepto estáticos de Next y favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}