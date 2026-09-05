// features/anuncios/utils/truncarTexto.ts

/**
 * Corta un texto largo (como la descripción) y agrega "..."
 * Útil para que el JobCard no crezca de tamaño según el contenido.
 */
export function truncarTexto(texto: string, maxCaracteres: number): string {
  if (texto.length <= maxCaracteres) return texto;
  return texto.slice(0, maxCaracteres).trim() + '...';
}