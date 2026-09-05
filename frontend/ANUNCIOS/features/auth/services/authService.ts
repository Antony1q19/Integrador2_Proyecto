// features/auth/services/authService.ts
import { Usuario } from '../types';

function simularRetardoDeRed<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const usuarioMock: Usuario = {
  id: 'usr-001',
  nombre: 'Marco Antonio',
  email: 'marco.antonio@example.com',
};

export async function iniciarSesion(email: string, password: string): Promise<Usuario> {
  // TODO: reemplazar por fetch real al backend de postulantes cuando exista
  return simularRetardoDeRed(usuarioMock);
}

export async function cerrarSesion(): Promise<void> {
  return simularRetardoDeRed(undefined);
}