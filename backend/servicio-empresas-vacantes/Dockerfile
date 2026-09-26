# Receta para construir la imagen (la "caja") del microservicio de empresas y vacantes.
# Se construye desde la carpeta backend/ (ver docker-compose.yml: context: ./backend).

# Punto de partida: una imagen ligera con Python 3.12 ya instalado.
FROM python:3.12-slim

WORKDIR /app

# Código compartido (shared_kernel). Se copia primero para que Docker no lo
# vuelva a copiar cuando solo cambie el código de este servicio.
COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

# Instalar las librerías de Python que necesita este servicio.
COPY servicio-empresas-vacantes/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código propio del servicio.
COPY servicio-empresas-vacantes/app ./app

# Evitar que Python cree carpetas __pycache__ (archivos .pyc de caché) dentro del
# proyecto. PYTHONUNBUFFERED hace que los logs salgan al instante en `docker logs`.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8002

# --reload: reinicia solo cuando cambias el código (cómodo para desarrollar).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload", "--timeout-keep-alive", "60"]
