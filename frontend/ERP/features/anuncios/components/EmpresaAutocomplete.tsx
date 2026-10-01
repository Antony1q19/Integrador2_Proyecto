"use client";

import { useState, useRef, useEffect } from "react";
import { Empresa } from "@/features/empresas/types/empresa";
import { fetchEmpresas } from "@/features/empresas/services/empresasApi";

interface EmpresaAutocompleteProps {
  value: number | undefined; // el empresaId seleccionado actualmente
  onChange: (empresaId: number) => void;
  error?: string;
}

export default function EmpresaAutocomplete({
  value,
  onChange,
  error,
}: EmpresaAutocompleteProps) {
  // Solo se ofrecen las empresas que el usuario puede ver (las trae el backend).
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.razonSocial.toLowerCase().includes(busqueda.toLowerCase())
  );

  useEffect(() => {
    let cancelado = false;
    fetchEmpresas()
      .then((lista) => {
        if (cancelado) return;
        setEmpresas(lista);
        // Si ya había una empresa elegida (edición), se muestra su nombre.
        const elegida = lista.find((e) => e.id === value);
        if (elegida) setBusqueda(elegida.razonSocial);
      })
      .catch(() => {
        // Sin lista, el desplegable mostrará "No se encontraron empresas".
      });
    return () => {
      cancelado = true;
    };
    // Se carga una sola vez al abrir el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cierra el dropdown si el usuario hace clic fuera del componente
  useEffect(() => {
    function manejarClicFuera(e: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setDropdownAbierto(false);
      }
    }

    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  const handleSeleccionar = (empresaId: number, razonSocial: string) => {
    onChange(empresaId);
    setBusqueda(razonSocial);
    setDropdownAbierto(false);
  };

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setDropdownAbierto(true);
        }}
        onFocus={() => setDropdownAbierto(true)}
        placeholder="Busca una empresa por razón social..."
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-slate-300 focus:ring-primary-200"
        }`}
      />

      {dropdownAbierto && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {empresasFiltradas.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">
              No se encontraron empresas
            </li>
          )}

          {empresasFiltradas.map((empresa) => (
            <li key={empresa.id}>
              <button
                type="button"
                onClick={() =>
                  handleSeleccionar(empresa.id, empresa.razonSocial)
                }
                className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
              >
                <div className="font-medium text-slate-800">
                  {empresa.razonSocial}
                </div>
                <div className="text-xs text-slate-400">
                  RUC: {empresa.ruc}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}