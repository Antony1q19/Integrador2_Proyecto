"use client";

import { 
  Users, 
  Briefcase, 
  CalendarCheck, 
  TrendingUp, 
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

export default function DashboardPage() {
  // Datos simulados (Mock) para el dashboard
  const stats = [
    { title: "Total Postulantes", value: "1,248", trend: "+12% este mes", icon: Users, color: "from-blue-500 to-cyan-400" },
    { title: "Vacantes Activas", value: "24", trend: "+3 nuevas hoy", icon: Briefcase, color: "from-violet-500 to-purple-500" },
    { title: "Entrevistas Hoy", value: "8", trend: "Agenda llena", icon: CalendarCheck, color: "from-pink-500 to-rose-400" },
    { title: "Contratados (Mes)", value: "45", trend: "+15% vs mes anterior", icon: TrendingUp, color: "from-emerald-400 to-teal-500" },
  ];

  const recentCandidates = [
    { id: 1, name: "Ana García", role: "Desarrollador Frontend", status: "Entrevista", time: "Hace 2 horas" },
    { id: 2, name: "Carlos López", role: "Gerente de Marketing", status: "Evaluación", time: "Hace 4 horas" },
    { id: 3, name: "María Fernández", role: "Diseñador UX/UI", status: "Contratado", time: "Hace 1 día" },
    { id: 4, name: "Jorge Ramírez", role: "Analista de Datos", status: "Rechazado", time: "Hace 1 día" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Contratado": return <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 size={12}/> Contratado</span>;
      case "Entrevista": return <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full"><Clock size={12}/> Entrevista</span>;
      case "Evaluación": return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full"><Clock size={12}/> Evaluación</span>;
      case "Rechazado": return <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full"><XCircle size={12}/> Rechazado</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-8">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Principal</h1>
        <p className="text-slate-500 mt-1">Resumen general de reclutamiento y selección.</p>
      </div>

      {/* Grid de Métricas (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-auto">{stat.trend}</p>
              {/* Brillo decorativo */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-transparent to-black opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            </div>
          );
        })}
      </div>

      {/* Secciones inferiores divididas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Candidatos Recientes (Ocupa 2 espacios) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Candidatos Recientes</h2>
            <button className="text-sm font-medium text-violet-600 hover:text-violet-700">Ver todos</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-semibold">Candidato</th>
                  <th className="pb-3 font-semibold">Puesto Aplicado</th>
                  <th className="pb-3 font-semibold">Estado</th>
                  <th className="pb-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{candidate.name}</p>
                          <p className="text-xs text-slate-400">{candidate.time}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-slate-600 font-medium">{candidate.role}</td>
                    <td className="py-4">{getStatusBadge(candidate.status)}</td>
                    <td className="py-4 text-right">
                      <button className="text-slate-400 hover:text-violet-600 p-1 rounded-md hover:bg-violet-50 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Progreso de Vacantes Principales */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Vacantes Urgentes</h2>
          
          <div className="space-y-6">
            {/* Vacante 1 */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Desarrollador Backend</p>
                  <p className="text-xs text-slate-500">4 de 5 contratados</p>
                </div>
                <span className="text-xs font-bold text-violet-600">80%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-violet-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            {/* Vacante 2 */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Especialista en RRHH</p>
                  <p className="text-xs text-slate-500">1 de 3 contratados</p>
                </div>
                <span className="text-xs font-bold text-blue-500">33%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '33%' }}></div>
              </div>
            </div>

            {/* Vacante 3 */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Diseñador Gráfico</p>
                  <p className="text-xs text-slate-500">0 de 1 contratados</p>
                </div>
                <span className="text-xs font-bold text-amber-500">0%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-8 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors">
            Gestionar Vacantes
          </button>
        </div>

      </div>
    </div>
  );
}