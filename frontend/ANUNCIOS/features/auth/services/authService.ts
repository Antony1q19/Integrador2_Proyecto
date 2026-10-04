// features/auth/services/authService.ts
//
// Capa de servicio de autenticación para ANUNCIOS.
// Llama exclusivamente a las rutas seguras de Next.js (/api/auth/*),
// que a su vez se comunican con el API Gateway y gestionan las cookies httpOnly.

import { DatosRegistroPostulante, Usuario } from '../types';

export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  const respuesta = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => null);
    throw new Error(errorJson?.error ?? 'No pudimos iniciar sesión. Verifica tus credenciales.');
  }

  const { usuario } = await respuesta.json();
  return usuario;
}

export async function registrarCuenta(datos: DatosRegistroPostulante): Promise<Usuario> {
  const respuesta = await fetch('/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => null);
    throw new Error(errorJson?.error ?? 'No pudimos crear tu cuenta.');
  }

  const { usuario } = await respuesta.json();
  return usuario;
}

export async function cerrarSesion(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function obtenerSesionActual(): Promise<Usuario | null> {
  try {
    const respuesta = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!respuesta.ok) {
      return null;
    }

    const { usuario } = await respuesta.json();
    return usuario;
  } catch {
    return null;
  }
}

export async function solicitarRecuperacion(email: string): Promise<string> {
  const respuesta = await fetch('/api/auth/recuperar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => null);
    throw new Error(errorJson?.error ?? 'No se pudo procesar la solicitud en este momento.');
  }

  const data = await respuesta.json();
  return data.mensaje;
}

export async function restablecerPassword(token: string, nuevaPassword: string): Promise<string> {
  const respuesta = await fetch('/api/auth/restablecer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, nuevaPassword }),
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => null);
    throw new Error(errorJson?.error ?? 'El enlace no es válido o ya venció.');
  }

  const data = await respuesta.json();
  return data.mensaje;
}

export async function aceptarTerminosVigentes(version = '2026-01'): Promise<void> {
  const respuesta = await fetch('/api/auth/aceptar-terminos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => null);
    throw new Error(errorJson?.error ?? 'No se pudo registrar la aceptación de términos.');
  }
}
