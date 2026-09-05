// features/postulantes/components/PerfilProfesionalResumen.tsx
//
// Muestra (solo lectura) la formación académica, los idiomas y la
// experiencia laboral que el postulante completó al crear su perfil en la
// bolsa de trabajo. RRHH lo consulta desde la ficha, en "Datos personales";
// no se edita aquí (ver ANUNCIOS/features/perfil para el flujo de edición
// del propio candidato).
import { ExperienciaLaboral, FormacionAcademica, IdiomaPostulante } from "../types/postulante.types";

const ETIQUETAS_NIVEL_FORMACION: Record<FormacionAcademica["nivel"], string> = {
  SECUNDARIA: "Secundaria",
  TECNICO: "Técnico",
  UNIVERSITARIO: "Universitario",
  POSTGRADO: "Postgrado",
  OTRO: "Otro",
};

const ETIQUETAS_NIVEL_IDIOMA: Record<IdiomaPostulante["nivel"], string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
  NATIVO: "Nativo",
};

interface PerfilProfesionalResumenProps {
  formacionAcademica: FormacionAcademica[];
  idiomas: IdiomaPostulante[];
  experiencia: ExperienciaLaboral[];
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</h3>
      {children}
    </div>
  );
}

export function PerfilProfesionalResumen({
  formacionAcademica,
  idiomas,
  experiencia,
}: PerfilProfesionalResumenProps) {
  return (
    <div className="space-y-4">
      <Bloque titulo="Formación académica">
        {formacionAcademica.length === 0 ? (
          <p className="text-sm text-gray-400">No registra formación académica.</p>
        ) : (
          <ul className="space-y-2">
            {formacionAcademica.map((f) => (
              <li key={f.id}>
                <p className="text-sm font-medium text-gray-800">{f.titulo}</p>
                <p className="text-sm text-gray-500">{f.institucion}</p>
                <p className="text-xs text-gray-400">
                  {ETIQUETAS_NIVEL_FORMACION[f.nivel]} · {f.fechaInicio} —{" "}
                  {f.enCurso ? "Actualidad" : f.fechaFin || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque titulo="Idiomas">
        {idiomas.length === 0 ? (
          <p className="text-sm text-gray-400">No registra idiomas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {idiomas.map((i) => (
              <span
                key={i.id}
                className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {i.nombre} · {ETIQUETAS_NIVEL_IDIOMA[i.nivel]}
              </span>
            ))}
          </div>
        )}
      </Bloque>

      <Bloque titulo="Experiencia laboral">
        {experiencia.length === 0 ? (
          <p className="text-sm text-gray-400">No registra experiencia laboral.</p>
        ) : (
          <ul className="space-y-2">
            {experiencia.map((e) => (
              <li key={e.id}>
                <p className="text-sm font-medium text-gray-800">{e.cargo}</p>
                <p className="text-sm text-gray-500">{e.empresa}</p>
                <p className="text-xs text-gray-400">
                  {e.fechaInicio} — {e.actualidad ? "Actualidad" : e.fechaFin || "—"}
                </p>
                {e.descripcion && <p className="mt-1 text-sm text-gray-600">{e.descripcion}</p>}
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}
