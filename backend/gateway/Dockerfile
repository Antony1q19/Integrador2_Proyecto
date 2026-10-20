# Receta para construir la imagen (la "caja") del Gateway.
# Imagen de PRODUCCIÓN (AWS ECS Fargate). Se construye desde la carpeta backend/ (ver infra/aws/publicar.ps1).

# Punto de partida: una imagen ligera con Python 3.12 ya instalado.
FROM python:3.12-slim

WORKDIR /app

# Código compartido (shared_kernel). Se copia primero para que Docker no lo
# vuelva a copiar cuando solo cambie el código del Gateway.
COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

# Instalar las librerías de Python que necesita el Gateway.
COPY gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código propio del Gateway.
COPY gateway/app ./app

# Evitar que Python cree carpetas __pycache__ (archivos .pyc de caché) dentro del
# proyecto: no aportan nada y ensucian las carpetas. Se pone después de instalar
# las librerías a propósito, para no invalidar la caché de Docker de ese paso.
# PYTHONUNBUFFERED hace que los logs salgan al instante en CloudWatch Logs.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "60"]
