// features/postulantes/hooks/usePostulanteForm.ts
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
//import { 
//  PostulanteFormData, 
//  PostulanteFormErrors,
//  FUENTES_RECLUTAMIENTO 
//} from "../types/postulante.types";
import { 
  PostulanteFormData, 
  PostulanteFormErrors
} from "../types/postulante.types";
import { crearPostulante, fetchAnuncios } from "../services/postulantesService";
import { Anuncio } from "@/features/anuncios/types/anuncio";

// ============================================================
// VALIDADORES
// ============================================================

const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validarTelefono = (telefono: string): boolean => {
  const regex = /^[0-9]{9,15}$/;
  return regex.test(telefono.replace(/\s/g, ""));
};

const validarDNI = (numero: string, tipo: string): boolean => {
  if (tipo === "DNI") {
    return /^[0-9]{8}$/.test(numero);
  }
  if (tipo === "CE") {
    return /^[0-9]{8,12}$/.test(numero);
  }
  if (tipo === "PASAPORTE") {
    return /^[A-Z0-9]{6,12}$/.test(numero.toUpperCase());
  }
  return false;
};

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function usePostulanteForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdPostulanteId, setCreatedPostulanteId] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<PostulanteFormData>({
    nombres: "",
    apellidos: "",
    documentoTipo: "DNI",
    documentoNumero: "",
    fechaNacimiento: "",
    email: "",
    telefono: "",
    direccion: "",
    cargoPostulado: "",
    empresaCliente: "",
    fuenteReclutamiento: "",
  });
  
  const [errors, setErrors] = useState<PostulanteFormErrors>({});

  // ============================================================
  // OPCIONES DE EMPRESA Y CARGO (vienen de los anuncios de la base de datos)
  // ============================================================
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null);

  useEffect(() => {
    // Los setState van dentro de las respuestas de la promesa; `cancelado` evita
    // actualizar el estado si se sale de la página antes de que llegue la respuesta.
    let cancelado = false;
    fetchAnuncios()
      .then((lista) => {
        // Un anuncio cerrado ya no recibe postulantes.
        if (!cancelado) setAnuncios(lista.filter((a) => a.estado !== "Cerrado"));
      })
      .catch((e) => {
        if (!cancelado) setErrorOpciones(e instanceof Error ? e.message : "No se pudieron cargar las opciones");
      })
      .finally(() => {
        if (!cancelado) setCargandoOpciones(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Las dos listas se ajustan entre sí: si ya elegiste una empresa, "Cargo" solo ofrece
  // los anuncios de ESA empresa; si aún no, ofrece todos los cargos.
  const empresasOptions = useMemo(
    () => [...new Set(anuncios.map((a) => a.empresaRazonSocial))].sort((a, b) => a.localeCompare(b)),
    [anuncios]
  );
  const cargosOptions = useMemo(
    () =>
      [
        ...new Set(
          anuncios
            .filter((a) => !formData.empresaCliente || a.empresaRazonSocial === formData.empresaCliente)
            .map((a) => a.cargo)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [anuncios, formData.empresaCliente]
  );

  // ============================================================
  // VALIDACIÓN POR SECCIÓN
  // ============================================================

  const validarSeccion = useCallback((seccion: number): boolean => {
    const nuevosErrores: PostulanteFormErrors = {};

    // Sección 0: Datos Personales
    if (seccion === 0) {
      if (!formData.nombres.trim()) {
        nuevosErrores.nombres = "Los nombres son obligatorios";
      } else if (formData.nombres.trim().length < 2) {
        nuevosErrores.nombres = "Los nombres deben tener al menos 2 caracteres";
      }

      if (!formData.apellidos.trim()) {
        nuevosErrores.apellidos = "Los apellidos son obligatorios";
      } else if (formData.apellidos.trim().length < 2) {
        nuevosErrores.apellidos = "Los apellidos deben tener al menos 2 caracteres";
      }

      if (!formData.documentoNumero.trim()) {
        nuevosErrores.documentoNumero = "El número de documento es obligatorio";
      } else if (!validarDNI(formData.documentoNumero, formData.documentoTipo)) {
        nuevosErrores.documentoNumero = `El número de ${formData.documentoTipo} no es válido`;
      }

      if (!formData.fechaNacimiento) {
        nuevosErrores.fechaNacimiento = "La fecha de nacimiento es obligatoria";
      } else {
        const edad = new Date().getFullYear() - new Date(formData.fechaNacimiento).getFullYear();
        if (edad < 18) {
          nuevosErrores.fechaNacimiento = "El postulante debe ser mayor de edad";
        }
        if (edad > 80) {
          nuevosErrores.fechaNacimiento = "La fecha de nacimiento parece incorrecta";
        }
      }
    }

    // Sección 1: Datos de Contacto
    if (seccion === 1) {
      if (!formData.email.trim()) {
        nuevosErrores.email = "El email es obligatorio";
      } else if (!validarEmail(formData.email)) {
        nuevosErrores.email = "Ingresa un email válido (ej: nombre@dominio.com)";
      }

      if (!formData.telefono.trim()) {
        nuevosErrores.telefono = "El teléfono es obligatorio";
      } else if (!validarTelefono(formData.telefono)) {
        nuevosErrores.telefono = "Ingresa un teléfono válido (mínimo 9 dígitos)";
      }
    }

    // Sección 2: Datos de Postulación
    if (seccion === 2) {
      if (!formData.cargoPostulado.trim()) {
        nuevosErrores.cargoPostulado = "El cargo postulado es obligatorio";
      }

      if (!formData.empresaCliente.trim()) {
        nuevosErrores.empresaCliente = "La empresa cliente es obligatoria";
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [formData]);

  // ============================================================
  // ACTUALIZAR CAMPO
  // ============================================================

  const handleChange = useCallback((
    field: keyof PostulanteFormData,
    value: string
  ) => {
    setFormData((prev) => {
      const siguiente = { ...prev, [field]: value };

      if (field === "empresaCliente" && siguiente.cargoPostulado) {
        // Si el cargo elegido no existe en la nueva empresa, se limpia.
        const existe = anuncios.some(
          (a) => a.cargo === siguiente.cargoPostulado && (!value || a.empresaRazonSocial === value)
        );
        if (!existe) siguiente.cargoPostulado = "";
      }

      if (field === "cargoPostulado" && value && !siguiente.empresaCliente) {
        // Si solo UNA empresa tiene ese cargo, se elige sola.
        const empresasConCargo = [...new Set(anuncios.filter((a) => a.cargo === value).map((a) => a.empresaRazonSocial))];
        if (empresasConCargo.length === 1) siguiente.empresaCliente = empresasConCargo[0];
      }
      return siguiente;
    });

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors, anuncios]);

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  const irASiguienteSeccion = useCallback(() => {
    if (validarSeccion(currentSection)) {
      setCurrentSection((prev) => Math.min(prev + 1, 2));
    }
  }, [currentSection, validarSeccion]);

  const irASeccionAnterior = useCallback(() => {
    setCurrentSection((prev) => Math.max(prev - 1, 0));
  }, []);

  // ============================================================
  // ENVIAR FORMULARIO
  // ============================================================

  const handleSubmit = useCallback(async () => {
    // Validar última sección
    if (!validarSeccion(2)) {
      return;
    }

    setIsLoading(true);
    try {
      const nuevoPostulante = await crearPostulante(formData);
      setCreatedPostulanteId(nuevoPostulante.id);
      setIsSuccess(true);
    } catch (error) {
      console.error("Error al crear postulante:", error);
      // Se muestra el motivo real que dio el servidor (ej. "Ya existe un postulante con ese
      // correo"); si no hay uno legible, un mensaje genérico.
      setErrors((prev) => ({
        ...prev,
        general: error instanceof Error ? error.message : "Error al guardar el postulante. Intenta nuevamente.",
      }));
    } finally {
      setIsLoading(false);
    }
  }, [formData, validarSeccion]); // 👈 QUITAR errors de dependencias

  // ============================================================
  // REDIRIGIR DESPUÉS DEL ÉXITO
  // ============================================================

  useEffect(() => {
    if (isSuccess && createdPostulanteId) {
      const timer = setTimeout(() => {
        router.push(`/postulantes/${createdPostulanteId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, createdPostulanteId, router]);

  // ============================================================
  // RETORNO
  // ============================================================

  return {
    formData,
    errors,
    isLoading,
    isSuccess,
    createdPostulanteId,
    currentSection,
    empresasOptions,
    cargosOptions,
    cargandoOpciones,
    errorOpciones,
    handleChange,
    handleSubmit,
    irASiguienteSeccion,
    irASeccionAnterior,
    validarSeccion,
  };
}