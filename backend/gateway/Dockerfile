FROM python:3.12-slim

WORKDIR /app

# La librería compartida se copia primero para aprovechar la cache de Docker
# cuando solo cambia el código propio del servicio.
COPY libs/shared/shared_kernel ./libs/shared_kernel
ENV PYTHONPATH=/app/libs

COPY gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY gateway/app ./app
COPY gateway/alembic.ini ./alembic.ini
COPY gateway/alembic ./alembic

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
