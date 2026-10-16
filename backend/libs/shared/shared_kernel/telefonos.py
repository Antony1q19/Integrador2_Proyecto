"""Teléfonos en un solo formato: solo dígitos y con código de país (Perú, 51, por defecto).

En la base hay teléfonos escritos de muchas formas ("947757081", "+51 947 757 081",
"0051947757081"...). WhatsApp los identifica siempre con el código de país, así que para
guardarlos y compararlos se pasan todos por aquí:

    normalizar_telefono("947757081")        → "51947757081"
    normalizar_telefono("+51 947 757 081")  → "51947757081"
    normalizar_telefono("0051947757081")    → "51947757081"
    normalizar_telefono("+1 415 523 8886")  → "14155238886"   (ya trae otro código: se respeta)
"""

CODIGO_PAIS_POR_DEFECTO = "51"
# Un celular peruano tiene 9 dígitos: si viene así, es que le falta el código de país.
_DIGITOS_NUMERO_LOCAL = 9


def normalizar_telefono(telefono: str | None, codigo_pais: str = CODIGO_PAIS_POR_DEFECTO) -> str:
    """Devuelve solo dígitos con código de país, o "" si no hay ningún dígito."""
    digitos = "".join(c for c in (telefono or "") if c.isdigit())
    if digitos.startswith("00"):  # prefijo internacional escrito como 00 en vez de +
        digitos = digitos[2:]
    if len(digitos) == _DIGITOS_NUMERO_LOCAL:
        digitos = codigo_pais + digitos
    return digitos
