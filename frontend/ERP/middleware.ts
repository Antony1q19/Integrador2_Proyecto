// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value;
  const token = request.cookies.get('authToken')?.value;
  const { pathname } = request.nextUrl;

  // 0. Sesión vencida: el token (cookie httpOnly) dura 1 hora y desaparece solo, pero las
  // cookies de UI (userRole...) podrían seguir ahí. Sin token no hay sesión real: se limpian
  // y se manda al login (si no, la pantalla cargaría y todas las llamadas darían 401).
  if (role && !token) {
    const respuesta = pathname.startsWith('/login')
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
    for (const nombre of ['userRole', 'userName', 'userEmail', 'userEmpresas']) {
      respuesta.cookies.delete(nombre);
    }
    return respuesta;
  }
  
  // 1. Si no hay sesión y no está en /login, redirigir al login
  if (!role && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si ya hay sesión e intenta entrar al /login, mandarlo a su perfil
  if (role && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/perfil', request.url));
  }

  // 2.b. La raíz "/" no tiene página propia: si hay sesión, mandarlo a su
  // perfil (evita el 404 de "Página no encontrada" al entrar solo con
  // "localhost:3000", sin ruta).
  if (role && pathname === '/') {
    return NextResponse.redirect(new URL('/perfil', request.url));
  }

  // 3. RUTAS PROTEGIDAS SEGÚN ROL (Ejemplo de reglas)
  if (role) {
    // Si es Supervisor, prohibirle entrar a /empresas o /anuncios
    if (role === 'Supervisor' && (pathname.startsWith('/empresas') || pathname.startsWith('/anuncios'))) {
      return NextResponse.redirect(new URL('/perfil', request.url));
    }

    // El Dashboard lo pueden ver los 3 roles: el backend solo entrega los datos de las empresas que
    // cada persona tiene asignada (un Admin ve todas), así que no hace falta bloquearlo por rol.
  }
 
  return NextResponse.next();
}
 
export const config = {
  // Proteger todo excepto estáticos de Next y favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

