"""Seguridad del Gateway: punto único desde donde se importa todo lo de seguridad.

No define nada nuevo: solo junta en un lugar lo que viene de la librería
compartida, para que el resto del Gateway importe todo desde `app.core.security`.

  - Contraseñas (hash / comprobar)  → shared_kernel/passwords.py
  - Token JWT y firma al Gateway    → shared_kernel/security.py
"""
from shared_kernel.passwords import (  # noqa: F401
    HASH_DUMMY,
    hash_password,
    validar_politica_password,
    verificar_password,
)
from shared_kernel.security import (  # noqa: F401
    crear_token_acceso,
    decodificar_token,
    firmar_peticion_gateway,
)
