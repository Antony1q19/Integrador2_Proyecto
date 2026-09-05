"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginMock } from "@/features/login/sesion/mockAuth";

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
      const user = await loginMock(email, password);
      document.cookie = `userRole=${user.role}; path=/; max-age=86400`;
      document.cookie = `userName=${user.name}; path=/; max-age=86400`;

      // REDIRECCIÓN SEGÚN ROL (#12)
      if (user.role === 'Admin') {
        router.push("/dashboard");
      } else if (user.role === 'RRHH') {
        router.push("/postulantes");
      } else {
        router.push("/perfil"); // Supervisor
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Contenedor principal de la tarjeta (shadow, bordes redondeados y ocultar desbordamiento)
    <div className="flex w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex-col md:flex-row">
      
      {/* ===== PANEL IZQUIERDO: DISEÑO GRÁFICO ===== */}
      {/* Se oculta en móviles y se muestra en pantallas medianas en adelante */}
      <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-indigo-800 via-violet-600 to-purple-500 p-10 flex-col justify-between overflow-hidden">
        
        {/* Logo de TalentERP */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 text-white shadow-lg">
            {/* Ícono del rayito */}
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-none tracking-tight">Talent<span className="text-violet-200 opacity-80">ERP</span></h1>
            <p className="text-white/70 text-xs mt-1">Recursos Humanos</p>
          </div>
        </div>

        {/* Figuras geométricas decorativas (Tailwind puro) */}
        {/* Cápsula superior izquierda */}
        <div className="absolute top-20 -left-12 w-64 h-16 bg-gradient-to-r from-orange-300/40 to-pink-400/40 rounded-full rotate-45 backdrop-blur-sm shadow-xl"></div>
        {/* Círculo superior derecho */}
        <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-tr from-blue-300 to-violet-300 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)]"></div>
        {/* Cápsula central */}
        <div className="absolute top-1/2 left-10 w-72 h-20 bg-gradient-to-r from-purple-400/50 to-indigo-400/50 rounded-full -rotate-45 backdrop-blur-md"></div>
        {/* Círculo inferior izquierdo */}
        <div className="absolute bottom-16 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.4)] z-0"></div>
        {/* Cápsula inferior */}
        <div className="absolute -bottom-10 right-0 w-64 h-24 bg-gradient-to-r from-blue-500/40 to-cyan-400/40 rounded-full -rotate-45 backdrop-blur-sm"></div>
      </div>

      {/* ===== PANEL DERECHO: FORMULARIO ===== */}
      <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white relative">
        
        {/* Los 3 puntitos de la esquina superior derecha */}
        <div className="absolute top-8 right-8 flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        </div>

        <h2 className="text-3xl font-black text-center text-gray-900 mb-8 tracking-widest mt-4">LOGIN</h2>

        {/* Mensaje de error (si las credenciales fallan) */}
        {error && (
          <div className="mb-6 text-center p-3 text-sm text-red-500 bg-red-50 rounded-full border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Input: Username / Correo */}
          <div>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="Username / Correo"
              className="w-full px-6 py-3.5 bg-[#dbeafe] text-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-blue-300 font-medium transition-all text-sm"
            />
          </div>

          {/* Input: Password */}
          <div>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="Password"
              className="w-full px-6 py-3.5 bg-[#dbeafe] text-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-blue-300 font-medium transition-all text-sm"
            />
          </div>

          {/* Enlace: Forgot Password */}
          <div className="flex justify-end pr-2">
            <a href="#" className="text-[11px] text-gray-400 hover:text-blue-500 transition-colors font-medium">
              Forgot Password?
            </a>
          </div>

          {/* Botón de Login */}
          <div className="flex justify-center mt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-3/5 px-8 py-3 text-white font-bold text-sm tracking-wider rounded-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 transition-all shadow-[0_8px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_10px_25px_rgba(99,102,241,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "CARGANDO..." : "LOGIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}