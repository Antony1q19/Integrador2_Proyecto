// features/auth/services/authService.ts
//
// IMPORTANTE — unificado con el ERP: estas 3 cuentas corresponden 1 a 1 con
// los postulantes id "1", "2" y "3" en
// `ERP/features/postulantes/data/mockPostulantes.ts` y con los perfiles en
// `features/perfil/data/mockPerfil.ts`. Mismo id, mismo nombre. Contraseña
// mock única para las 3 (igual que en el login del ERP): "123456".

import { Usuario } from '../types';

function simularRetardoDeRed<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const CONTRASENA_MOCK = '123456';

const MOCK_USERS: Record<string, Usuario> = {
  'camila.rodriguez@example.com': {
    id: '1',
    nombre: 'Camila Rodríguez Vega',
    email: 'camila.rodriguez@example.com',
  },
  'diego.salazar@example.com': {
    id: '2',
    nombre: 'Diego Salazar Peña',
    email: 'diego.salazar@example.com',
  },
  'valeria.chumpitaz@example.com': {
    id: '3',
    nombre: 'Valeria Chumpitaz Ríos',
    email: 'valeria.chumpitaz@example.com',
  },
};

export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  // TODO: reemplazar por fetch real al backend de postulantes cuando exista
  const usuario = MOCK_USERS[email.trim().toLowerCase()];
  if (!usuario || password !== CONTRASENA_MOCK) {
    await simularRetardoDeRed(undefined);
    throw new Error('Credenciales inválidas');
  }
  return simularRetardoDeRed(usuario);
}

export async function cerrarSesion(): Promise<void> {
  return simularRetardoDeRed(undefined);
}
