with open('frontend/ERP/app/(dashboard)/layout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'import { AvisosWhatsApp } from "@/features/comunicaciones/components/AvisosWhatsApp";',
    'import { AvisosWhatsApp } from "@/features/comunicaciones/components/AvisosWhatsApp";\nimport { BannerAccesoRestringido } from "@/components/shared/BannerAccesoRestringido";'
)

text = text.replace(
    '{/* CONTENIDO DE LAS PÁGINAS */}',
    '{/* AVISO DE ACCESO RESTRINGIDO */}\n        <BannerAccesoRestringido />\n\n        {/* CONTENIDO DE LAS PÁGINAS */}'
)

with open('frontend/ERP/app/(dashboard)/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("layout.tsx actualizado exitosamente")
