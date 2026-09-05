// features/anuncios/utils/formatearSalario.ts

/**
 * Formatea el rango salarial de un anuncio para mostrarlo en el JobCard.
 * Maneja los 3 casos posibles: rango completo, solo mínimo, o ninguno.
 */
export function formatearSalario(min?: number, max?: number): string {
  const formatearNumero = (n: number) =>
    n.toLocaleString('es-PE'); // separador de miles: 3,500

  if (min && max) {
    return `S/ ${formatearNumero(min)} - S/ ${formatearNumero(max)}`;
  }
  if (min) {
    return `Desde S/ ${formatearNumero(min)}`;
  }
  return 'Salario a convenir';
}