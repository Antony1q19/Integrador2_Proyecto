// features/comunicaciones/data/mockData.ts
//import { Contacto, Mensaje, Conversacion } from "../types/comunicaciones.types";

import { Contacto, Mensaje } from "../types/comunicaciones.types";

export const mockContactos: Contacto[] = [
  {
    id: "1",
    nombre: "Camila",
    apellido: "Rodríguez Vega",
    telefono: "+51 987 654 321",
    email: "camila.rodriguez@example.com",
    noLeidos: 2,
    estado: "en_linea",
    ultimaActividad: new Date().toISOString(),
  },
  {
    id: "2",
    nombre: "Diego",
    apellido: "Salazar Peña",
    telefono: "+51 988 111 222",
    email: "diego.salazar@example.com",
    noLeidos: 0,
    estado: "ausente",
    ultimaActividad: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    nombre: "Valeria",
    apellido: "Chumpitaz Ríos",
    telefono: "+51 988 222 333",
    email: "valeria.chumpitaz@example.com",
    noLeidos: 1,
    estado: "desconectado",
    ultimaActividad: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    nombre: "Jorge",
    apellido: "Huamán Ttito",
    telefono: "+51 988 333 444",
    email: "jorge.huaman@example.com",
    noLeidos: 0,
    estado: "desconectado",
    ultimaActividad: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "5",
    nombre: "Ana Belén",
    apellido: "Quispe Farfán",
    telefono: "+51 988 444 555",
    email: "ana.quispe@example.com",
    noLeidos: 3,
    estado: "en_linea",
    ultimaActividad: new Date().toISOString(),
  },
];

export const mockMensajes: Record<string, Mensaje[]> = {
  "1": [
    {
      id: "m1",
      contactoId: "1",
      remitente: "contacto",
      texto: "Hola, quería consultar sobre el estado de mi postulación para el puesto de Analista de Sistemas.",
      fecha: new Date(Date.now() - 7200000).toISOString(),
      estado: "leido",
    },
    {
      id: "m2",
      contactoId: "1",
      remitente: "yo",
      texto: "¡Hola Camila! Tu postulación está en proceso de evaluación. En los próximos días te estaremos contactando para la entrevista técnica.",
      fecha: new Date(Date.now() - 7000000).toISOString(),
      estado: "entregado",
    },
    {
      id: "m3",
      contactoId: "1",
      remitente: "contacto",
      texto: "Excelente, muchas gracias por la información. Estaré atenta a cualquier novedad.",
      fecha: new Date(Date.now() - 6800000).toISOString(),
      estado: "leido",
    },
    {
      id: "m4",
      contactoId: "1",
      remitente: "yo",
      texto: "Perfecto. Te mantendremos informada. ¡Saludos!",
      fecha: new Date(Date.now() - 6600000).toISOString(),
      estado: "leido",
    },
    {
      id: "m5",
      contactoId: "1",
      remitente: "contacto",
      texto: "Disculpa, ¿tienes información sobre las fechas de la entrevista?",
      fecha: new Date(Date.now() - 1800000).toISOString(),
      estado: "entregado",
    },
  ],
  "3": [
    {
      id: "m6",
      contactoId: "3",
      remitente: "yo",
      texto: "¡Hola Valeria! ¿Cómo estás? Queremos programar una entrevista contigo para el puesto de Ejecutiva de Ventas.",
      fecha: new Date(Date.now() - 86400000).toISOString(),
      estado: "entregado",
    },
  ],
  "5": [
    {
      id: "m7",
      contactoId: "5",
      remitente: "contacto",
      texto: "Buenos días, quería saber si mi postulación sigue en proceso.",
      fecha: new Date(Date.now() - 1800000).toISOString(),
      estado: "entregado",
    },
    {
      id: "m8",
      contactoId: "5",
      remitente: "yo",
      texto: "¡Buenos días Ana Belén! Sí, tu postulación está en la etapa final. Pronto te contactaremos con la decisión final.",
      fecha: new Date(Date.now() - 1200000).toISOString(),
      estado: "entregado",
    },
    {
      id: "m9",
      contactoId: "5",
      remitente: "contacto",
      texto: "¡Qué alegría! Muchas gracias por la información.",
      fecha: new Date(Date.now() - 600000).toISOString(),
      estado: "entregado",
    },
  ],
};