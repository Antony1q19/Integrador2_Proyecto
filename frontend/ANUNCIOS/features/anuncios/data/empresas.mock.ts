// features/anuncios/data/empresas.mock.ts
import { Empresa } from '@/features/anuncios/types';

export const empresasMock: Empresa[] = [
  {
    id: 'emp-001',
    nombre: 'TechNova Solutions',
    logoUrl: '/logos/technova.png',
    ubicacion: 'Lima, Perú',
    rubro: 'Tecnología',
  },
  {
    id: 'emp-002',
    nombre: 'Constructora Andina S.A.',
    logoUrl: '/logos/andina.png',
    ubicacion: 'Arequipa, Perú',
    rubro: 'Construcción',
  },
  {
    id: 'emp-003',
    nombre: 'RetailMax Perú',
    logoUrl: '/logos/retailmax.png',
    ubicacion: 'Lima, Perú',
    rubro: 'Retail',
  },
];