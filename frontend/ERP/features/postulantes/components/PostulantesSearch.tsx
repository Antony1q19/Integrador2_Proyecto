
// features/postulantes/components/PostulantesSearch.tsx
"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface PostulantesSearchProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  initialValue?: string;
  delay?: number;
}

export function PostulantesSearch({
  onSearch,
  placeholder = "Buscar por nombre o documento...",
  initialValue = "",
  delay = 500,
}: PostulantesSearchProps) {
  const [value, setValue] = useState(initialValue);

  // Debounce: espera a que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, onSearch, delay]);

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
