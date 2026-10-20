# Receta para construir la imagen (la "caja") del microservicio de comunicaciones.
# Imagen de PRODUCCIÓN (AWS ECS Fargate). Se construye desde la carpeta backend/ (ver infra/aws/publicar.ps1).
FROM python:3.12-slim

WORKDIR /app

# Código compartido (shared_kernel).
COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

# Instalar las librerías de Python.
COPY servicio-comunicaciones/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código propio del servicio.
COPY servicio-comunicaciones/app ./app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004", "--timeout-keep-alive", "60"]