with open('frontend/ANUNCIOS/features/perfil/components/PerfilView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target_import = "import { PerfilHeader } from './PerfilHeader';"
replacement_import = "import { PerfilHeader } from './PerfilHeader';\nimport { PerfilCompletenessBar } from './PerfilCompletenessBar';"

target_jsx = "<PerfilHeader perfil={perfil} guardando={guardando} onCambiarFoto={actualizarFoto} />"
replacement_jsx = "<PerfilHeader perfil={perfil} guardando={guardando} onCambiarFoto={actualizarFoto} />\n\n      <PerfilCompletenessBar perfil={perfil} />"

text = text.replace(target_import, replacement_import).replace(target_jsx, replacement_jsx)

with open('frontend/ANUNCIOS/features/perfil/components/PerfilView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("PerfilView.tsx integrado con PerfilCompletenessBar")
