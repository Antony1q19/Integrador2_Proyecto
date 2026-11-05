'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { PerfilPostulante } from '../types';

interface PerfilCompletenessProps {
  perfil: PerfilPostulante;
}

export function PerfilCompletenessBar({ perfil }: PerfilCompletenessProps) {
  const tieneDatos = Boolean(perfil.datosPersonales?.nombres && perfil.datosPersonales?.apellidos);
  const tieneTelefono = Boolean(perfil.datosPersonales?.telefono);
  const tieneCv = Boolean(perfil.cv?.nombreArchivo);
  const tieneResumen = Boolean(perfil.resumenProfesional && perfil.resumenProfesional.trim().length > 15);
  const tieneExp = Boolean(perfil.experiencia && perfil.experiencia.length > 0);
  const tieneFormacion = Boolean(perfil.formacionAcademica && perfil.formacionAcademica.length > 0);

  const requisitos = [
    { label: 'Datos básicos', ok: tieneDatos, peso: 20 },
    { label: 'Teléfono', ok: tieneTelefono, peso: 15 },
    { label: 'Currículum (CV)', ok: tieneCv, peso: 30 },
    { label: 'Resumen profesional', ok: tieneResumen, peso: 15 },
    { label: 'Experiencia', ok: tieneExp, peso: 10 },
    { label: 'Formación', ok: tieneFormacion, peso: 10 },
  ];

  const porcentaje = requisitos.reduce((acc, r) => acc + (r.ok ? r.peso : 0), 0);

  const colorBarra =
    porcentaje >= 80 ? 'bg-emerald-500' : porcentaje >= 50 ? 'bg-blue-600' : 'bg-amber-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          {porcentaje >= 80 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-900">
            Completitud de tu Perfil Laboral
          </span>
        </div>
        <span className="text-sm font-bold text-gray-800">
          {porcentaje}% completado
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${colorBarra}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Chips de estado */}
      <div className="flex flex-wrap gap-2 pt-1">
        {requisitos.map((r, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              r.ok
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-gray-50 text-gray-500 border border-gray-200'
            }`}
          >
            {r.ok ? '✓' : '○'} {r.label}
          </span>
        ))}
      </div>

      {porcentaje < 70 && (
        <p className="text-xs text-gray-500">
          💡 <strong>Tip para postular:</strong> Sube tu CV y completa tu resumen profesional para aumentar un 80% las posibilidades de ser contactado.
        </p>
      )}
    </div>
  );
}
