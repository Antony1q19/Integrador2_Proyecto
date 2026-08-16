// features/postulantes/utils/evaluacion.ts
//
// Reglas de cálculo del resultado de la evaluación (HU-08). Se centralizan
// aquí para que el formulario y cualquier otra vista usen siempre la misma
// lógica. Cuando exista backend Java, este cálculo debería replicarse (o
// idealmente venir ya resuelto) en el servicio; mientras tanto el frontend
// lo simula para dar feedback inmediato al usuario de RRHH.

import { CompetenciasEvaluacion, ResultadoEvaluacion } from "../types/postulante.types";

export const COMPETENCIAS: { clave: keyof CompetenciasEvaluacion; etiqueta: string }[] = [
  { clave: "comunicacionEfectiva", etiqueta: "Comunicación efectiva" },
  { clave: "orientacionCliente", etiqueta: "Orientación al cliente" },
  { clave: "responsabilidad", etiqueta: "Responsabilidad" },
  { clave: "adaptabilidadFlexibilidad", etiqueta: "Adaptabilidad y flexibilidad" },
  { clave: "toleranciaPresion", etiqueta: "Tolerancia a la presión" },
  { clave: "dinamismoEnergia", etiqueta: "Dinamismo y energía" },
];

// Puntaje mínimo (sobre 100) para ser considerado APTO por competencias.
export const UMBRAL_APTO = 70;

export function calcularPuntajeTotal(competencias: CompetenciasEvaluacion): number {
  const suma = COMPETENCIAS.reduce((acc, { clave }) => acc + competencias[clave], 0);
  const promedio = suma / COMPETENCIAS.length; // escala 1-5
  return Math.round((promedio / 5) * 100);
}

// APTO requiere puntaje suficiente por competencias, no registrar
// antecedentes penales y contar con carné de sanidad vigente.
export function calcularResultado(
  competencias: CompetenciasEvaluacion,
  carneSanidad: boolean,
  antecedentesPenales: boolean
): ResultadoEvaluacion {
  const puntajeTotal = calcularPuntajeTotal(competencias);
  const cumpleRequisitos = carneSanidad && !antecedentesPenales;
  return puntajeTotal >= UMBRAL_APTO && cumpleRequisitos ? "APTO" : "NO_APTO";
}
