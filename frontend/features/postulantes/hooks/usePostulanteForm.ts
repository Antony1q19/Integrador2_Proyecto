// features/postulantes/hooks/usePostulanteForm.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  PostulanteFormData, 
  PostulanteFormErrors,
  FUENTES_RECLUTAMIENTO 
} from "../types/postulante.types";
import { crearPostulante } from "../services/postulantesService";
import { empresasMock } from "@/features/empresas/data/mock_empresas";
import { anunciosMock } from "@/features/anuncios/data/mock-anuncios";

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

  // Obtener opciones para selects dinámicos
  const empresasOptions = empresasMock.map((e) => e.razonSocial);
  const cargosOptions = [...new Set(anunciosMock.map((a) => a.cargo))];

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
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

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
      setErrors((prev) => ({
        ...prev,
        general: "Error al guardar el postulante. Intenta nuevamente.",
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
    handleChange,
    handleSubmit,
    irASiguienteSeccion,
    irASeccionAnterior,
    validarSeccion,
  };
}