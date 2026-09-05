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
        carneSanidad: "SI_CUENTA",
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
  // Postulantes adicionales (datos mínimos) para poblar las demás columnas
  // de la vista Kanban (HU-09).
  {
    id: "2",
    fechaRegistro: "2026-07-10T10:00:00",
    estadoActual: "POSTULADO",
    datosPersonales: {
      nombres: "Diego",
      apellidos: "Salazar Peña",
      documentoTipo: "DNI",
      documentoNumero: "70123456",
      email: "diego.salazar@example.com",
      telefono: "+51 988 111 222",
      fechaNacimiento: "1995-06-20",
      cargoPostulado: "Asistente Contable",
      empresaCliente: "Corporación Andina S.A.",
      fuenteReclutamiento: "Bolsa de trabajo",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      { id: "h4", estado: "POSTULADO", fecha: "2026-07-10T10:00:00", usuarioResponsable: "Luis Fernández" },
    ],
  },
  {
    id: "3",
    fechaRegistro: "2026-07-08T09:00:00",
    estadoActual: "EN_EVALUACION",
    datosPersonales: {
      nombres: "Valeria",
      apellidos: "Chumpitaz Ríos",
      documentoTipo: "DNI",
      documentoNumero: "71234567",
      email: "valeria.chumpitaz@example.com",
      telefono: "+51 988 222 333",
      fechaNacimiento: "1998-01-11",
      cargoPostulado: "Ejecutiva de Ventas",
      empresaCliente: "Distribuidora Del Sur E.I.R.L.",
      fuenteReclutamiento: "Referido",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      { id: "h5", estado: "POSTULADO", fecha: "2026-07-08T09:00:00", usuarioResponsable: "Luis Fernández" },
      { id: "h6", estado: "EN_EVALUACION", fecha: "2026-07-11T15:00:00", usuarioResponsable: "María Gutiérrez" },
    ],
  },
  {
    id: "4",
    fechaRegistro: "2026-06-20T09:00:00",
    estadoActual: "PRESELECCIONADO",
    datosPersonales: {
      nombres: "Jorge",
      apellidos: "Huamán Ttito",
      documentoTipo: "DNI",
      documentoNumero: "72345678",
      email: "jorge.huaman@example.com",
      telefono: "+51 988 333 444",
      fechaNacimiento: "1993-09-02",
      cargoPostulado: "Supervisor de Operaciones",
      empresaCliente: "Corporación Andina S.A.",
      fuenteReclutamiento: "LinkedIn",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      { id: "h7", estado: "POSTULADO", fecha: "2026-06-20T09:00:00", usuarioResponsable: "Luis Fernández" },
      { id: "h8", estado: "ENTREVISTA", fecha: "2026-06-25T09:00:00", usuarioResponsable: "María Gutiérrez" },
      { id: "h9", estado: "PRESELECCIONADO", fecha: "2026-07-01T09:00:00", usuarioResponsable: "María Gutiérrez" },
    ],
  },
  {
    id: "5",
    fechaRegistro: "2026-06-01T09:00:00",
    estadoActual: "CONTRATADO",
    datosPersonales: {
      nombres: "Ana Belén",
      apellidos: "Quispe Farfán",
      documentoTipo: "DNI",
      documentoNumero: "73456789",
      email: "ana.quispe@example.com",
      telefono: "+51 988 444 555",
      fechaNacimiento: "1996-11-30",
      cargoPostulado: "Analista de Marketing",
      empresaCliente: "Distribuidora Del Sur E.I.R.L.",
      fuenteReclutamiento: "Bolsa de trabajo",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      { id: "h10", estado: "POSTULADO", fecha: "2026-06-01T09:00:00", usuarioResponsable: "Luis Fernández" },
      { id: "h11", estado: "CONTRATADO", fecha: "2026-06-18T09:00:00", usuarioResponsable: "María Gutiérrez" },
    ],
  },
  {
    id: "6",
    fechaRegistro: "2026-07-05T09:00:00",
    estadoActual: "DESCARTADO",
    datosPersonales: {
      nombres: "Renzo",
      apellidos: "Ortiz Delgado",
      documentoTipo: "DNI",
      documentoNumero: "74567890",
      email: "renzo.ortiz@example.com",
      telefono: "+51 988 555 666",
      fechaNacimiento: "1994-04-17",
      cargoPostulado: "Analista de Sistemas Senior",
      empresaCliente: "Corporación Andina S.A.",
      fuenteReclutamiento: "LinkedIn",
    },
    documentos: [],
    evaluaciones: [],
    historialEstados: [
      { id: "h12", estado: "POSTULADO", fecha: "2026-07-05T09:00:00", usuarioResponsable: "Luis Fernández" },
      { id: "h13", estado: "DESCARTADO", fecha: "2026-07-09T09:00:00", usuarioResponsable: "Luis Fernández", comentario: "No cumple con el nivel de inglés requerido" },
    ],
  },
];

export function getMockPostulanteById(id: string): Postulante | undefined {
  return mockPostulantes.find((p) => p.id === id);
}
