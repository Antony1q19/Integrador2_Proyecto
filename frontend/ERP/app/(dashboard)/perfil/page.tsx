"use client";

import { useState, useEffect } from "react";
import { User, Key, Users, Plus, Mail, Briefcase, ShieldCheck } from "lucide-react";
import { Role } from "@/features/portada/types/menu";

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<"mi-perfil" | "usuarios">("mi-perfil");
  const [userData, setUserData] = useState({ name: "", role: "", email: "" });

  useEffect(() => {
    // Leer cookies para cargar los datos del perfil activo
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return "";
    };
    
    setUserData({
      name: decodeURIComponent(getCookie("userName")|| "") || "Usuario",
      role: getCookie("userRole") || "Admin",
      email: getCookie("userRole") === "RRHH" ? "rrhh@test.com" : "admin@test.com" 
    });
  }, []);

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Configuración de Cuenta</h1>
        <p className="text-slate-500 mt-1">Gestiona tu información personal y los accesos del equipo.</p>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("mi-perfil")}
          className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "mi-perfil" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <User size={18} /> Mi Perfil
        </button>
        <button 
          onClick={() => setActiveTab("usuarios")}
          className={`pb-3 px-2 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "usuarios" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Users size={18} /> Gestión de Trabajadores
        </button>
      </div>

      {/* CONTENIDO: MI PERFIL (Issue #21) */}
      {activeTab === "mi-perfil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta de Datos Personales */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="text-violet-500" size={20}/> Datos Personales</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-200">{userData.name}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Correo Electrónico</label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-200 flex items-center gap-2"><Mail size={16} className="text-slate-400"/> {userData.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Rol de Sistema</label>
                  <div className="p-3 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold border border-violet-100 flex items-center gap-2"><ShieldCheck size={16}/> {userData.role}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-200 flex items-center gap-2"><Briefcase size={16} className="text-slate-400"/> Consultor</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Seguridad / Contraseña */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Key className="text-violet-500" size={20}/> Seguridad</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña Actual</label>
                <input type="password" placeholder="••••••••" className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                <input type="password" placeholder="••••••••" className="w-full p-3 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-violet-500" />
              </div>
              <button type="button" className="w-full mt-2 py-3 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition">Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      )}

      {/* CONTENIDO: GESTIÓN DE USUARIOS (Issues #22 y #24) */}
      {activeTab === "usuarios" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Trabajadores Registrados</h2>
              <p className="text-xs text-slate-500 mt-1">Administra los accesos de la consultora.</p>
            </div>
            <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition">
              <Plus size={16} /> Nuevo Usuario
            </button>
          </div>
          
          {/* Tabla de Usuarios */}
          <div className="overflow-x-auto p-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="pb-3 font-semibold">Usuario</th>
                  <th className="pb-3 font-semibold">Correo</th>
                  <th className="pb-3 font-semibold">Rol</th>
                  <th className="pb-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-medium text-sm text-slate-800">Xavier Ibarra</td>
                  <td className="py-4 text-sm text-slate-500">rrhh@test.com</td>
                  <td className="py-4"><span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">RRHH</span></td>
                  <td className="py-4"><span className="text-emerald-500 text-sm font-medium flex items-center gap-1">● Activo</span></td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-medium text-sm text-slate-800">Marco Alanya</td>
                  <td className="py-4 text-sm text-slate-500">super@test.com</td>
                  <td className="py-4"><span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">Supervisor</span></td>
                  <td className="py-4"><span className="text-emerald-500 text-sm font-medium flex items-center gap-1">● Activo</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}