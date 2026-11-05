with open('frontend/ERP/features/anuncios/components/AnunciosView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    if (anuncios.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-slate-400">
                    No se encontraron anuncios con los filtros seleccionados.
                </p>
            </div>
        );
    }'''

replacement = '''    if (anuncios.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-800">No se encontraron anuncios de empleo</h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                        No hay convocatorias activas que coincidan con los filtros aplicados o aún no se han registrado vacantes.
                    </p>
                </div>
                {puedeGestionar && (
                    <div className="pt-2">
                        <Link
                            href="/anuncios/nuevo"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Crear Primer Anuncio
                        </Link>
                    </div>
                )}
            </div>
        );
    }'''

text = text.replace(target, replacement)

with open('frontend/ERP/features/anuncios/components/AnunciosView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("AnunciosView.tsx actualizado con Empty State y CTA")
