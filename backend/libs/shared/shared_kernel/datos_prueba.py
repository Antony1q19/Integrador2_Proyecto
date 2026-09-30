"""Datos de prueba compartidos por los "seeds" de todos los servicios.

¿Qué es un seed?
Un pequeño código que, al encender un servicio en modo "desarrollo", inserta
UN registro de ejemplo en cada tabla (solo si todavía no existe), para que las
tablas nunca estén vacías al probar. Cada servicio tiene el suyo en
`app/infrastructure/seed.py`.

¿Por qué existe este archivo?
Cada servicio tiene su propia base de datos, así que NO pueden enlazarse con
llaves foráneas. Se enlazan por el id (un simple texto o número). Para que los
registros de prueba "encajen" entre sí (la postulación de prueba apunta al
postulante de prueba y al anuncio de prueba), todos los seeds leen los mismos
ids de aquí.

Los ids fijos solo se usan en desarrollo; datos ficticios, nunca reales.
"""

# Contraseña de todas las cuentas de prueba (la misma que ya usa el ERP).
PASSWORD_PRUEBA = "123456"

# --- servicio-postulantes -------------------------------------------------
# Id del postulante de prueba (formato uuid, como los ids reales).
POSTULANTE_PRUEBA_ID = "00000000-0000-4000-8000-000000000001"
POSTULANTE_PRUEBA_EMAIL = "postulante.prueba@example.com"

# --- servicio-empresas-vacantes -------------------------------------------
# Estas tablas usan números autoincrementales; en una base nueva, la primera
# fila que se inserta recibe el id 1. (Los mismos ids que ya usa el frontend
# en sus datos de ejemplo: la empresa 1 es "Consultora Andina S.A.C.")
EMPRESA_PRUEBA_ID = 1
ANUNCIO_PRUEBA_ID = 1
