with open('frontend/ERP/features/postulantes/components/PostulanteForm/SectionNavigation.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      {/* Indicador de progreso */}
      <div className="flex items-center justify-center gap-2">'''

replacement = '''      {/* Indicador de progreso */}
      <div className="flex flex-col items-center justify-center gap-1.5">
        <span className="text-xs font-semibold text-slate-600">
          Paso {currentSection + 1} de {totalSections} ({Math.round(((currentSection + 1) / totalSections) * 100)}% completado)
        </span>
        <div className="flex items-center justify-center gap-2">'''

text = text.replace(target, replacement)
text = text.replace('          />\n        ))}\n      </div>', '          />\n        ))}\n        </div>\n      </div>')

with open('frontend/ERP/features/postulantes/components/PostulanteForm/SectionNavigation.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("SectionNavigation.tsx actualizado con progreso numerico")
