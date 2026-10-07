"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { login } from "@/features/login/sesion/authService";
import { Button } from "@/components/shared/Button";

const claseInput =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      document.cookie = `userRole=${user.role}; path=/; max-age=3600`;
      document.cookie = `userName=${user.name}; path=/; max-age=3600`;
      document.cookie = `userEmail=${user.email}; path=/; max-age=3600`;
      // No es un secreto (solo IDs de empresa), por eso va en cookie
      // normal igual que userRole/userName -la usa /empresas para
      // filtrar qué ve cada rol que no sea Admin-.
      document.cookie = `userEmpresas=${encodeURIComponent(JSON.stringify(user.empresasVisibles))}; path=/; max-age=3600`;

      // REDIRECCIÓN SEGÚN ROL (#12). Con contraseña temporal, primero tiene que cambiarla.
      if (user.debeCambiarPassword) {
        router.push("/perfil");
      } else if (user.role === 'RRHH') {
        router.push("/postulantes"); // RRHH no ve el Dashboard
      } else {
        router.push("/dashboard"); // Admin y Supervisor
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:flex-row">
      {/* ===== PANEL IZQUIERDO: MARCA (solo desde pantallas medianas) ===== */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 p-10 md:flex md:w-1/2">
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none tracking-tight text-white">
              Talent<span className="text-primary-200">ERP</span>
            </p>
            <p className="mt-1 text-xs text-white/75">Recursos Humanos</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xl font-semibold leading-snug text-white">
            Todo el proceso de selección, en un solo lugar.
          </p>
          <p className="mt-2 text-sm text-white/75">
            Postulantes, entrevistas, contrataciones y empresas clientes.
          </p>
        </div>

        {/* Formas decorativas, en tonos de la marca */}
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-400/30 blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary-300/20 blur-2xl" />
        <div aria-hidden className="absolute right-10 top-1/3 h-24 w-24 rounded-full border border-white/20" />
      </div>

      {/* ===== PANEL DERECHO: FORMULARIO ===== */}
      <div className="flex w-full flex-col justify-center p-8 sm:p-10 md:w-1/2 md:p-14">
        {/* En celular el panel de marca no se ve: se muestra el nombre aquí */}
        <p className="mb-6 text-center text-xl font-extrabold tracking-tight text-slate-900 md:hidden">
          Talent<span className="text-primary-600">ERP</span>
        </p>

        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta de trabajador.</p>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nombre@empresa.com"
              className={claseInput}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={claseInput}
            />
          </div>

          <Button type="submit" tamano="lg" cargando={isLoading} textoCargando="Ingresando…" className="mt-2 w-full">
            Ingresar
          </Button>

          {/* No hay recuperación automática: un Admin restablece la clave desde "Mi perfil". */}
          <p className="text-center text-xs text-slate-500">
            ¿Olvidaste tu contraseña? Pídele a un administrador que la restablezca.
          </p>
        </form>
      </div>
    </div>
  );
}
