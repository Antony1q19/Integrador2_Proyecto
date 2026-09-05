// features/anuncios/data/anuncios.mock.ts
import { Anuncio } from '@/features/anuncios/types';
import { empresasMock } from './empresas.mock';

export const anunciosMock: Anuncio[] = [
  {
    id: 'anu-001',
    titulo: 'Desarrollador Frontend React/Next.js',
    empresa: empresasMock[0], // TechNova Solutions
    ubicacion: 'Lima, Perú',
    modalidad: 'remoto',
    salarioMin: 3500,
    salarioMax: 5000,
    descripcion:
      'Buscamos un desarrollador frontend con experiencia en React y Next.js para unirse a nuestro equipo de producto.',
    requisitos: [
      '2+ años de experiencia con React',
      'Conocimientos de TypeScript',
      'Experiencia con Tailwind CSS',
    ],
    fechaPublicacion: '2026-08-28T09:00:00Z',
    estado: 'activo',
    destacado: true,
  },
  {
    id: 'anu-002',
    titulo: 'Ingeniero Civil - Supervisión de Obra',
    empresa: empresasMock[1], // Constructora Andina
    ubicacion: 'Arequipa, Perú',
    modalidad: 'presencial',
    salarioMin: 4000,
    descripcion:
      'Responsable de supervisar el avance de obra y coordinar con los equipos de campo.',
    requisitos: [
      'Colegiatura vigente',
      '3+ años de experiencia en supervisión',
      'Disponibilidad para viajar',
    ],
    fechaPublicacion: '2026-08-25T14:30:00Z',
    estado: 'activo',
  },
  {
    id: 'anu-003',
    titulo: 'Asistente de Tienda',
    empresa: empresasMock[2], // RetailMax Perú
    ubicacion: 'Lima, Perú',
    modalidad: 'presencial',
    descripcion:
      'Atención al cliente y manejo de caja en tienda ubicada en centro comercial.',
    requisitos: ['Secundaria completa', 'Disponibilidad de horario rotativo'],
    fechaPublicacion: '2026-09-01T08:00:00Z',
    estado: 'activo',
  },
];