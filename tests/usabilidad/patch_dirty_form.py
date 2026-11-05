with open('frontend/ERP/features/postulantes/hooks/usePostulanteForm.ts', 'r', encoding='utf-8') as f:
    text = f.read()

dirty_form_code = '''  // ============================================================
  // PREVENCIÓN DE PÉRDIDA DE DATOS (DIRTY FORM)
  // ============================================================
  const isDirty = useMemo(() => {
    return Object.entries(formData).some(([key, val]) => {
      if (key === "documentoTipo") return val !== "DNI";
      return typeof val === "string" && val.trim().length > 0;
    });
  }, [formData]);

  useEffect(() => {
    if (!isDirty || isSuccess) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Hay información no guardada en el formulario de postulante. ¿Seguro que deseas salir?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, isSuccess]);
'''

target = '  // ============================================================ \n  // REDIRIGIR DESPUÉS DEL ÉXITO\n  // ============================================================'
# insertamos antes de RETORNO
target_retorno = '  // ============================================================\n  // RETORNO\n  // ============================================================'

replacement = dirty_form_code + '\n' + target_retorno

text = text.replace(target_retorno, replacement)

# agregamos isDirty al retorno
text = text.replace('    validarSeccion,\n  };', '    validarSeccion,\n    isDirty,\n  };')

with open('frontend/ERP/features/postulantes/hooks/usePostulanteForm.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("usePostulanteForm.ts actualizado con proteccion beforeunload")
