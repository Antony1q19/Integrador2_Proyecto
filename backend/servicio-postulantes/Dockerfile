# Receta para construir la imagen (la "caja") del microservicio de postulantes.
# Imagen de PRODUCCIÓN (AWS ECS Fargate). Se construye desde la carpeta backend/ (ver infra/aws/publicar.ps1).

# Punto de partida: una imagen ligera con Python 3.12 ya instalado.
FROM public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app

# Código compartido (shared_kernel). Se copia primero para que Docker no lo
# vuelva a copiar cuando solo cambie el código de este servicio.
COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

# Instalar las librerías de Python que necesita este servicio.
COPY servicio-postulantes/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código propio del servicio.
COPY servicio-postulantes/app ./app

# Evitar que Python cree carpetas __pycache__ (archivos .pyc de caché) dentro del
# proyecto: no aportan nada y ensucian las carpetas. Se pone después de instalar
# las librerías a propósito, para no invalidar la caché de Docker de ese paso.
# PYTHONUNBUFFERED hace que los logs salgan al instante en CloudWatch Logs.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--timeout-keep-alive", "60"]
