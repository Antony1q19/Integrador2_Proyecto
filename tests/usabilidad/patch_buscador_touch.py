with open('frontend/ANUNCIOS/features/anuncios/components/AnunciosBuscador.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {/* Se filtra mientras se escribe: no hace falta un botón "Buscar". */}
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <label htmlFor="buscar-empleo" className="sr-only">
              Buscar empleo
            </label>
            <input
              id="buscar-empleo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Puesto, empresa o palabra clave"
              className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            />
          </div>
        </div>'''

replacement = '''        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg space-y-2">
          {/* Se filtra mientras se escribe: no hace falta un botón "Buscar". */}
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <label htmlFor="buscar-empleo" className="sr-only">
              Buscar empleo
            </label>
            <input
              id="buscar-empleo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Puesto, empresa o palabra clave"
              className="w-full min-h-[44px] rounded-lg py-3 pl-11 pr-3 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            />
          </div>

          {/* Sugerencias de búsqueda rápida con target táctil ergonómico (min 44px) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-600">
            <span className="font-medium text-gray-700 hidden sm:inline">Popular:</span>
            {['Desarrollador', 'Contador', 'Ventas', 'Remoto'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setBusqueda(busqueda === tag ? '' : tag)}
                className={`min-h-[36px] sm:min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  busqueda.toLowerCase() === tag.toLowerCase()
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>'''

text = text.replace(target, replacement)

with open('frontend/ANUNCIOS/features/anuncios/components/AnunciosBuscador.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("AnunciosBuscador.tsx actualizado con target táctil móvil y chips")
