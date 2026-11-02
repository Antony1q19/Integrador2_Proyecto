// Fixture común: en CADA prueba, cualquier respuesta 5xx o error de JavaScript del navegador hace
// fallar la prueba. Es la señal más directa de una incompatibilidad con ese navegador.
import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ vigilarErrores: void }>({
  vigilarErrores: [
    async ({ page }, use) => {
      const problemas: string[] = [];
      page.on("response", (respuesta) => {
        if (respuesta.status() >= 500) {
          problemas.push(`${respuesta.status()} ${respuesta.request().method()} ${respuesta.url()}`);
        }
      });
      page.on("pageerror", (error) => problemas.push(`Error de JavaScript: ${error.message}`));
      await use();
      expect(problemas, "respuestas 5xx o errores de JavaScript en el navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
