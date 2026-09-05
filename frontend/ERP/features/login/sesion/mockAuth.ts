// features/auth/services/mockAuth.ts
export type Role = 'Admin' | 'RRHH' | 'Supervisor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

// Simulamos una base de datos
const MOCK_USERS: Record<string, User> = {
  'admin@test.com': { id: '1', email: 'admin@test.com',name:'Leonardo Morales', role: 'Admin' },
  'rrhh@test.com': { id: '2', email: 'rrhh@test.com',name:'Xavier Ibarra', role: 'RRHH' },
  'super@test.com': { id: '3', email: 'super@test.com',name:'Marco Alanya', role: 'Supervisor' },
};

export const loginMock = async (email: string, password: string): Promise<User> => {
  // Simulamos el tiempo de red para probar el estado "cargando"
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const user = MOCK_USERS[email];
  if (user && password === '123456') { // Contraseña genérica para el mock
    return user;
  }
  throw new Error('Credenciales inválidas');
};