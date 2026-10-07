// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { permisosDe } from '@/lib/permisos'
import { esOrigenValido } from '@/lib/csrf'

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];
 
export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value;
  const token = request.cookies.get('authToken')?.value;
  const { pathname } = request.nextUrl;

  // Rutas /api (las que hablan con el Gateway): solo se revisa el origen de lo que modifica datos
  // (protección CSRF, ver lib/csrf.ts). La sesión y los permisos los valida el backend.
  if (pathname.startsWith('/api/')) {
    if (!METODOS_SEGUROS.includes(request.method) && !esOrigenValido(request)) {
      return NextResponse.json({ error: 'Petición no autorizada (origen inválido)' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 0. Sesión vencida: el token (cookie httpOnly) dura 1 hora y desaparece solo, pero las
  // cookies de UI (userRole...) podrían seguir ahí. Sin token no hay sesión real: se limpian
  // y se manda al login (si no, la pantalla cargaría y todas las llamadas darían 401).
  if (role && !token) {
    const respuesta = pathname.startsWith('/login')
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
    for (const nombre of ['userRole', 'userName', 'userEmail', 'userEmpresas', 'cambioPassword']) {
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

  // 2.c. Entró con una contraseña temporal: hasta cambiarla solo puede estar en /perfil (el Gateway
  // igual rechaza todo lo demás; esto evita que vea pantallas llenas de errores).
  if (role && request.cookies.get('cambioPassword')?.value && !pathname.startsWith('/perfil')) {
    return NextResponse.redirect(new URL('/perfil', request.url));
  }

  // 3. RUTAS PROTEGIDAS SEGÚN ROL (matriz en lib/permisos.ts; el backend aplica las mismas reglas)
  if (role) {
    const permisos = permisosDe(role);
    const inicio = role === 'RRHH' ? '/postulantes' : '/dashboard';
    // RRHH (reclutamiento) no ve el Dashboard.
    if (pathname.startsWith('/dashboard') && !permisos.puedeVerDashboard) {
      return NextResponse.redirect(new URL(inicio, request.url));
    }
    // Crear/editar anuncios: Admin y Supervisor. (Ver la lista y el detalle: todos.)
    if (/^\/anuncios\/(nuevo|[^/]+\/editar)(\/|$)/.test(pathname) && !permisos.puedeGestionarAnuncios) {
      return NextResponse.redirect(new URL('/anuncios', request.url));
    }
    // Crear empresas: solo Admin. Editar: Admin y Supervisor.
    if (/^\/empresas\/nueva(\/|$)/.test(pathname) && !permisos.puedeCrearEliminarEmpresas) {
      return NextResponse.redirect(new URL('/empresas', request.url));
    }
    if (/^\/empresas\/[^/]+\/editar(\/|$)/.test(pathname) && !permisos.puedeEditarEmpresas) {
      return NextResponse.redirect(new URL('/empresas', request.url));
    }
  }
 
  return NextResponse.next();
}
 
export const config = {
  // Proteger todo excepto estáticos de Next y favicon
  // Todo excepto estáticos de Next y favicon. Incluye /api para la revisión CSRF (ver arriba).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

