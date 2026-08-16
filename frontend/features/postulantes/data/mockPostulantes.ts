// features/postulantes/data/mockPostulantes.ts
//
// Datos MOMENTÁNEOS mientras no existe el backend Java conectado.
// Cuando se integre la API, este archivo se elimina y `postulantesService.ts`
// deja de importarlo (ver ese archivo para el punto exacto de swap).

import { Postulante } from "../types/postulante.types";

export const mockPostulantes: Postulante[] = [
  {
    id: "1",
    fechaRegistro: "2026-07-02T09:15:00",
    estadoActual: "ENTREVISTA",
    datosPersonales: {
      nombres: "Camila",
      apellidos: "Rodríguez Vega",
      documentoTipo: "DNI",
      documentoNumero: "72841093",
      email: "camila.rodriguez@example.com",
      telefono: "+51 987 654 321",
      fechaNacimiento: "1997-03-14",
      direccion: "Av. Javier Prado 1450, San Isidro, Lima",
      cargoPostulado: "Analista de Sistemas Senior",
      empresaCliente: "Corporación Andina S.A.",
      fuenteReclutamiento: "LinkedIn",
    },
    documentos: [
      { id: "d1", nombreArchivo: "CV_Camila_Rodriguez.pdf", tipo: "CV", tamanioKb: 482, fechaCarga: "2026-07-02T09:20:00" },
      { id: "d2", nombreArchivo: "DNI_frontal.jpg", tipo: "DNI", tamanioKb: 210, fechaCarga: "2026-07-02T09:22:00" },
      { id: "d3", nombreArchivo: "Certificado_AWS.pdf", tipo: "CERTIFICADO", tamanioKb: 156, fechaCarga: "2026-07-05T14:10:00" },
    ],
    evaluaciones: [
      {
        id: "e1",
        evaluador: "Luis Fernández",
        fecha: "2026-07-03",
        competencias: {
          comunicacionEfectiva: 5,
          orientacionCliente: 4,
          responsabilidad: 5,
          adaptabilidadFlexibilidad: 4,
          toleranciaPresion: 4,
          dinamismoEnergia: 5,
        },
        puntajeTotal: 90,
        resultado: "APTO",
        carneSanidad: true,
        antecedentesPenales: false,
        comentarios: "Buena comunicación y disponibilidad inmediata.",
      },
    ],
    historialEstados: [
      { id: "h1", estado: "POSTULADO", fecha: "2026-07-02T09:15:00", usuarioResponsable: "Luis Fernández" },
      { id: "h2", estado: "EN_EVALUACION", fecha: "2026-07-03T11:00:00", usuarioResponsable: "Luis Fernández", comentario: "Pasa a evaluación técnica" },
      { id: "h3", estado: "ENTREVISTA", fecha: "2026-07-08T16:30:00", usuarioResponsable: "María Gutiérrez", comentario: "Programada entrevista con supervisor de área" },
    ],
  },
];

export function getMockPostulanteById(id: string): Postulante | undefined {
  return mockPostulantes.find((p) => p.id === id);
}
