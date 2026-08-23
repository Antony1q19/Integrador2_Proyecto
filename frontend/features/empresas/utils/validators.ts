export function validarRUC(ruc: string): boolean {
  const regexRUC = /^\d{11}$/;
  return regexRUC.test(ruc);
}

export function validarEmail(email: string): boolean {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexEmail.test(email);
}

export function validarTelefono(telefono: string): boolean {
  const soloNumeros = telefono.replace(/[^\d]/g, "");
  return soloNumeros.length >= 9;
}