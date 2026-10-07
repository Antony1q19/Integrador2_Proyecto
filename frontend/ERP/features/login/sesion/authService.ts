// features/login/sesion/authService.ts
//
// Login del ERP. El navegador nunca habla directo con el Gateway ni
// maneja el JWT: llama a las rutas propias del servidor de Next.js
// (app/api/auth/login, app/api/auth/logout), que son las que hablan con
// el Gateway y guardan el token en una cookie httpOnly (ver esos archivos
// para el detalle). No existe modo mock: si el backend no responde, esto
// falla con un error real, no hay fallback simulado.

import { vaciarCache } from '@/lib/cacheCliente';

export type Role = 'Admin' | 'RRHH' | 'Supervisor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  empresasVisibles: number[];
  debeCambiarPassword: boolean;
}

export const login = async (email: string, password: string): Promise<User> => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.error ?? 'Credenciales inválidas');
  }

  // Nueva sesión: nada de lo que se guardó en memoria (de otra persona) debe verse.
  vaciarCache();
  const { rol, nombre, empresasVisibles, debeCambiarPassword } = await res.json();
  // No tenemos un id numérico real acá (el JWT que lo trae nunca llega al
  // cliente); el email alcanza como identificador único de UI.
  return {
    id: email,
    email,
    name: nombre,
    role: rol as Role,
    empresasVisibles: empresasVisibles ?? [],
    debeCambiarPassword: Boolean(debeCambiarPassword),
  };
};

export async function cerrarSesionApi(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  vaciarCache();
}
