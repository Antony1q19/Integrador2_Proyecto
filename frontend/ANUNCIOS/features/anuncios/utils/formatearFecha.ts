// features/anuncios/utils/formatearFecha.ts

/**
 * Convierte una fecha ISO en un texto relativo tipo
 * "Publicado hace 3 días", como se ve en Computrabajo.
 */
export function formatearFechaRelativa(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Publicado hoy';
  if (diffDias === 1) return 'Publicado ayer';
  if (diffDias < 30) return `Publicado hace ${diffDias} días`;

  const diffMeses = Math.floor(diffDias / 30);
  if (diffMeses === 1) return 'Publicado hace 1 mes';
  return `Publicado hace ${diffMeses} meses`;
}