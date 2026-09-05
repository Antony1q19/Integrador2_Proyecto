// features/postulantes/data/mockPostulantes.ts
//
// Datos MOMENTÁNEOS mientras no existe el backend Java conectado.
// Cuando se integre la API, este archivo se elimina y `postulantesService.ts`
// deja de importarlo (ver ese archivo para el punto exacto de swap).
//
// IMPORTANTE — unificado con la app ANUNCIOS: estos 3 postulantes son las
// mismas 3 personas que existen como cuentas mock en
// `ANUNCIOS/features/auth/services/authService.ts` y
// `ANUNCIOS/features/perfil/data/mockPerfil.ts` (mismo id, mismos datos
// personales, misma formación/idiomas/experiencia). También están asociadas
// a un anuncio en `features/anuncios/data/mock-anuncios.ts`, así que la
// pestaña "Dónde ha postulado" muestra algo para las 3. Se mantiene
// deliberadamente en 3 registros (en vez de varios parciales) para que,
// al conectar el backend real, haya un único set de datos de referencia
// consistente entre ambos frontends en lugar de tener que reconciliar
// identidades distintas para la "misma" persona.

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
        comentarios: "Buena comunicación y disponibilidad inmediata.",
      },
    ],
    historialEstados: [
      { id: "h1", estado: "POSTULADO", fecha: "2026-07-02T09:15:00", usuarioResponsable: "Luis Fernández" },
      { id: "h2", estado: "EN_EVALUACION", fecha: "2026-07-03T11:00:00", usuarioResponsable: "Luis Fernández", comentario: "Pasa a evaluación técnica" },
      { id: "h3", estado: "ENTREVISTA", fecha: "2026-07-08T16:30:00", usuarioResponsable: "María Gutiérrez", comentario: "Programada entrevista con supervisor de área" },
    ],
    formacionAcademica: [
      {
        id: "fa1",
        institucion: "Universidad Nacional Mayor de San Marcos",
        titulo: "Ingeniería de Sistemas",
        nivel: "UNIVERSITARIO",
        fechaInicio: "2015-03",
        fechaFin: "2020-12",
        enCurso: false,
      },
      {
        id: "fa2",
        institucion: "Cibertec",
        titulo: "Diplomado en Cloud Computing (AWS)",
        nivel: "POSTGRADO",
        fechaInicio: "2023-04",
        fechaFin: "2023-10",
        enCurso: false,
      },
    ],
    idiomas: [
      { id: "id1", nombre: "Inglés", nivel: "AVANZADO" },
      { id: "id2", nombre: "Portugués", nivel: "BASICO" },
    ],
    experiencia: [
      {
        id: "ex1",
        empresa: "Softtek Perú",
        cargo: "Analista de Sistemas",
        fechaInicio: "2021-01",
        fechaFin: "2026-06",
        actualidad: false,
        descripcion: "Mantenimiento y desarrollo de módulos internos en .NET y SQL Server.",
      },
      {
        id: "ex2",
        empresa: "Grupo Deltron",
        cargo: "Practicante de TI",
        fechaInicio: "2020-01",
        fechaFin: "2020-12",
        actualidad: false,
      },
    ],
    // Postula a un solo anuncio (id "1"): su pipeline ahí coincide con el
    // proceso "principal" de arriba.
    procesosPostulacion: {
      "1": {
        estadoActual: "ENTREVISTA",
        historialEstados: [
          { id: "ph1", estado: "POSTULADO", fecha: "2026-07-02T09:15:00", usuarioResponsable: "Luis Fernández" },
          { id: "ph2", estado: "EN_EVALUACION", fecha: "2026-07-03T11:00:00", usuarioResponsable: "Luis Fernández", comentario: "Pasa a evaluación técnica" },
          { id: "ph3", estado: "ENTREVISTA", fecha: "2026-07-08T16:30:00", usuarioResponsable: "María Gutiérrez", comentario: "Programada entrevista con supervisor de área" },
        ],
      },
    },
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: false,
      fechaAceptacion: "2026-07-02T09:10:00",
    },
  },
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
      direccion: "Jr. Ayacucho 350, Cercado de Lima",
      cargoPostulado: "Asistente Contable",
      empresaCliente: "Corporación Andina S.A.",
      fuenteReclutamiento: "Bolsa de trabajo",
    },
    documentos: [
      { id: "d4", nombreArchivo: "CV_Diego_Salazar.pdf", tipo: "CV", tamanioKb: 310, fechaCarga: "2026-07-10T10:05:00" },
      { id: "d5", nombreArchivo: "DNI_Diego_Salazar.jpg", tipo: "DNI", tamanioKb: 198, fechaCarga: "2026-07-10T10:06:00" },
    ],
    evaluaciones: [],
    historialEstados: [
      { id: "h4", estado: "POSTULADO", fecha: "2026-07-10T10:00:00", usuarioResponsable: "Luis Fernández" },
    ],
    formacionAcademica: [
      {
        id: "fa3",
        institucion: "Instituto San Ignacio de Loyola",
        titulo: "Contabilidad",
        nivel: "TECNICO",
        fechaInicio: "2013-03",
        fechaFin: "2015-12",
        enCurso: false,
      },
    ],
    idiomas: [{ id: "id3", nombre: "Inglés", nivel: "BASICO" }],
    experiencia: [
      {
        id: "ex3",
        empresa: "Contadores Asociados del Perú S.A.C.",
        cargo: "Asistente Contable",
        fechaInicio: "2016-02",
        fechaFin: "2026-06",
        actualidad: false,
        descripcion: "Registro de operaciones contables, conciliaciones bancarias y apoyo en declaraciones tributarias mensuales.",
      },
    ],
    procesosPostulacion: {
      "2": {
        estadoActual: "POSTULADO",
        historialEstados: [
          { id: "ph4", estado: "POSTULADO", fecha: "2026-07-10T10:00:00", usuarioResponsable: "Luis Fernández" },
        ],
      },
    },
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: true,
      fechaAceptacion: "2026-07-10T09:55:00",
    },
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
      direccion: "Av. Angamos Este 1234, Surquillo, Lima",
      cargoPostulado: "Ejecutiva de Ventas",
      empresaCliente: "Distribuidora Del Sur E.I.R.L.",
      fuenteReclutamiento: "Referido",
    },
    documentos: [
      { id: "d6", nombreArchivo: "CV_Valeria_Chumpitaz.pdf", tipo: "CV", tamanioKb: 275, fechaCarga: "2026-07-08T09:10:00" },
    ],
    evaluaciones: [
      {
        id: "e2",
        evaluador: "María Gutiérrez",
        fecha: "2026-07-12",
        competencias: {
          comunicacionEfectiva: 4,
          orientacionCliente: 5,
          responsabilidad: 4,
          adaptabilidadFlexibilidad: 4,
          toleranciaPresion: 4,
          dinamismoEnergia: 4,
        },
        puntajeTotal: 84,
        resultado: "APTO",
        comentarios: "Buena actitud comercial, pendiente validar referencias laborales.",
      },
    ],
    historialEstados: [
      { id: "h5", estado: "POSTULADO", fecha: "2026-07-08T09:00:00", usuarioResponsable: "Luis Fernández" },
      { id: "h6", estado: "EN_EVALUACION", fecha: "2026-07-11T15:00:00", usuarioResponsable: "María Gutiérrez" },
    ],
    formacionAcademica: [
      {
        id: "fa4",
        institucion: "Universidad de Lima",
        titulo: "Administración y Marketing",
        nivel: "UNIVERSITARIO",
        fechaInicio: "2014-03",
        fechaFin: "2019-12",
        enCurso: false,
      },
    ],
    idiomas: [{ id: "id4", nombre: "Inglés", nivel: "INTERMEDIO" }],
    experiencia: [
      {
        id: "ex4",
        empresa: "Retail Sur Perú S.A.C.",
        cargo: "Ejecutiva de Ventas",
        fechaInicio: "2020-01",
        fechaFin: "2026-06",
        actualidad: false,
        descripcion: "Atención a clientes, cumplimiento de metas mensuales de venta y manejo de caja.",
      },
    ],
    // Ejemplo de postulante con 2 procesos simultáneos en etapas distintas:
    // "Asesor Financiero" recién arrancando, "Jefe de Tienda" ya contratada.
    procesosPostulacion: {
      "3": {
        estadoActual: "EN_EVALUACION",
        historialEstados: [
          { id: "ph5", estado: "POSTULADO", fecha: "2026-08-10T09:00:00", usuarioResponsable: "Luis Fernández" },
          { id: "ph6", estado: "EN_EVALUACION", fecha: "2026-08-12T10:00:00", usuarioResponsable: "María Gutiérrez" },
        ],
      },
      "4": {
        estadoActual: "CONTRATADO",
        historialEstados: [
          { id: "ph7", estado: "POSTULADO", fecha: "2026-06-06T09:00:00", usuarioResponsable: "Luis Fernández" },
          { id: "ph8", estado: "ENTREVISTA", fecha: "2026-06-10T14:00:00", usuarioResponsable: "María Gutiérrez", comentario: "Entrevista con gerencia de tienda" },
          { id: "ph9", estado: "CONTRATADO", fecha: "2026-06-18T09:00:00", usuarioResponsable: "María Gutiérrez", comentario: "Ya trabajó antes en la empresa; contratación directa" },
        ],
      },
    },
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: false,
      fechaAceptacion: "2026-07-08T08:50:00",
    },
  },
];

export function getMockPostulanteById(id: string): Postulante | undefined {
  return mockPostulantes.find((p) => p.id === id);
}
