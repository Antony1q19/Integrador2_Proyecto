FROM python:3.12-slim

WORKDIR /app

COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

COPY servicio-postulantes/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY servicio-postulantes/app ./app
COPY servicio-postulantes/alembic.ini ./alembic.ini
COPY servicio-postulantes/alembic ./alembic

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
