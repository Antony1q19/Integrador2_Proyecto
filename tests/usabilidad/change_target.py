with open('tests/usabilidad/actualizar_excel_corregido.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "wb.save('tests/usabilidad/casos-prueba-usabilidad-iso25010.xlsx')",
    "wb.save('tests/usabilidad/casos-prueba-usabilidad-iso25010-atendido.xlsx')"
)

with open('tests/usabilidad/actualizar_excel_corregido.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("actualizar_excel_corregido.py modificado para guardar como atendido")
