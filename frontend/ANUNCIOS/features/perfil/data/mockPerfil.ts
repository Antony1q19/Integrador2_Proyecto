// features/perfil/data/mockPerfil.ts
//
// Datos MOMENTÁNEOS mientras no existe el backend conectado. Cuando se
// integre la API, este archivo se elimina y `perfilService.ts` deja de
// importarlo (ver ese archivo para el punto exacto de swap).
//
// IMPORTANTE — unificado con el ERP: estas 3 cuentas son las mismas 3
// personas que existen como postulantes en
// `ERP/features/postulantes/data/mockPostulantes.ts` (mismo id, mismos
// datos personales, misma formación/idiomas/experiencia). Se mantiene en
// sincronía a propósito: al conectar el backend real ambos frontends deben
// resolver a la misma entidad "postulante" por id, sin tener que reconciliar
// datos distintos para la misma persona. Las credenciales de estas 3 cuentas
// están en `features/auth/services/authService.ts`.

import { PerfilPostulante } from '../types';

export const mockPerfiles: Record<string, PerfilPostulante> = {
  '1': {
    id: '1',
    datosPersonales: {
      nombres: 'Camila',
      apellidos: 'Rodríguez Vega',
      documentoTipo: 'DNI',
      documentoNumero: '72841093',
      email: 'camila.rodriguez@example.com',
      telefono: '+51 987 654 321',
      fechaNacimiento: '1997-03-14',
      direccion: 'Av. Javier Prado 1450, San Isidro, Lima',
    },
    resumenProfesional:
      'Analista de sistemas con experiencia en desarrollo y mantenimiento de aplicaciones .NET y soluciones cloud en AWS. Enfocada en buenas prácticas y trabajo en equipo.',
    formacionAcademica: [
      {
        id: 'fa1',
        institucion: 'Universidad Nacional Mayor de San Marcos',
        titulo: 'Ingeniería de Sistemas',
        nivel: 'UNIVERSITARIO',
        fechaInicio: '2015-03',
        fechaFin: '2020-12',
        enCurso: false,
      },
      {
        id: 'fa2',
        institucion: 'Cibertec',
        titulo: 'Diplomado en Cloud Computing (AWS)',
        nivel: 'POSTGRADO',
        fechaInicio: '2023-04',
        fechaFin: '2023-10',
        enCurso: false,
      },
    ],
    idiomas: [
      { id: 'id1', nombre: 'Inglés', nivel: 'AVANZADO' },
      { id: 'id2', nombre: 'Portugués', nivel: 'BASICO' },
    ],
    experiencia: [
      {
        id: 'ex1',
        empresa: 'Softtek Perú',
        cargo: 'Analista de Sistemas',
        fechaInicio: '2021-01',
        fechaFin: '2026-06',
        actualidad: false,
        descripcion: 'Mantenimiento y desarrollo de módulos internos en .NET y SQL Server.',
      },
      {
        id: 'ex2',
        empresa: 'Grupo Deltron',
        cargo: 'Practicante de TI',
        fechaInicio: '2020-01',
        fechaFin: '2020-12',
        actualidad: false,
      },
    ],
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: false,
      fechaAceptacion: '2026-07-02T09:10:00',
    },
  },
  '2': {
    id: '2',
    datosPersonales: {
      nombres: 'Diego',
      apellidos: 'Salazar Peña',
      documentoTipo: 'DNI',
      documentoNumero: '70123456',
      email: 'diego.salazar@example.com',
      telefono: '+51 988 111 222',
      fechaNacimiento: '1995-06-20',
      direccion: 'Jr. Ayacucho 350, Cercado de Lima',
    },
    resumenProfesional:
      'Asistente contable con formación técnica en contabilidad, orientado a la organización y el cumplimiento de plazos en procesos administrativos y tributarios.',
    formacionAcademica: [
      {
        id: 'fa3',
        institucion: 'Instituto San Ignacio de Loyola',
        titulo: 'Contabilidad',
        nivel: 'TECNICO',
        fechaInicio: '2013-03',
        fechaFin: '2015-12',
        enCurso: false,
      },
    ],
    idiomas: [{ id: 'id3', nombre: 'Inglés', nivel: 'BASICO' }],
    experiencia: [
      {
        id: 'ex3',
        empresa: 'Contadores Asociados del Perú S.A.C.',
        cargo: 'Asistente Contable',
        fechaInicio: '2016-02',
        fechaFin: '2026-06',
        actualidad: false,
        descripcion:
          'Registro de operaciones contables, conciliaciones bancarias y apoyo en declaraciones tributarias mensuales.',
      },
    ],
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: true,
      fechaAceptacion: '2026-07-10T09:55:00',
    },
  },
  '3': {
    id: '3',
    datosPersonales: {
      nombres: 'Valeria',
      apellidos: 'Chumpitaz Ríos',
      documentoTipo: 'DNI',
      documentoNumero: '71234567',
      email: 'valeria.chumpitaz@example.com',
      telefono: '+51 988 222 333',
      fechaNacimiento: '1998-01-11',
      direccion: 'Av. Angamos Este 1234, Surquillo, Lima',
    },
    resumenProfesional:
      'Ejecutiva comercial con experiencia en atención al cliente y cumplimiento de metas de venta, orientada a la construcción de relaciones comerciales duraderas.',
    formacionAcademica: [
      {
        id: 'fa4',
        institucion: 'Universidad de Lima',
        titulo: 'Administración y Marketing',
        nivel: 'UNIVERSITARIO',
        fechaInicio: '2014-03',
        fechaFin: '2019-12',
        enCurso: false,
      },
    ],
    idiomas: [{ id: 'id4', nombre: 'Inglés', nivel: 'INTERMEDIO' }],
    experiencia: [
      {
        id: 'ex4',
        empresa: 'Retail Sur Perú S.A.C.',
        cargo: 'Ejecutiva de Ventas',
        fechaInicio: '2020-01',
        fechaFin: '2026-06',
        actualidad: false,
        descripcion: 'Atención a clientes, cumplimiento de metas mensuales de venta y manejo de caja.',
      },
    ],
    consentimientos: {
      tratamientoDatos: true,
      comunicacionesComerciales: false,
      fechaAceptacion: '2026-07-08T08:50:00',
    },
  },
};

export const ID_PERFIL_POR_DEFECTO = '1';
