"""Código compartido por el Gateway y por los microservicios.

Aquí vive lo que TODOS necesitan y sería tonto copiar y pegar en cada uno:
leer la configuración (.env), conectarse a la base de datos, firmar/verificar
tokens, escribir logs y responder errores con el mismo formato.

No es un servicio: nadie lo "ejecuta". Los demás lo importan así:
    from shared_kernel.security import decodificar_token
"""
