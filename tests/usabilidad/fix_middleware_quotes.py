with open('frontend/ERP/middleware.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'return NextResponse.redirect(new URL(${inicio}?acceso_denegado=dashboard, request.url));',
    'return NextResponse.redirect(new URL(`${inicio}?acceso_denegado=dashboard`, request.url));'
)

with open('frontend/ERP/middleware.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("middleware.ts corregido con backticks")
