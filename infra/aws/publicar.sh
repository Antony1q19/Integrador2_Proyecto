#!/usr/bin/env bash
# Construye las 7 imágenes de PRODUCCIÓN y las sube a ECR. Ejecutar cada vez que cambie el código:
#     bash infra/aws/publicar.sh
# Si la app está prendida, además reinicia los servicios para que usen las imágenes nuevas.
source "$(dirname "$0")/comun.sh"
verificar_credenciales

[ "$(estado_stack "$STACK_BASE")" != NO_EXISTE ] || error "Primero hay que crear el stack base (bash infra/aws/prender.sh lo crea)"
command -v docker >/dev/null && docker info >/dev/null 2>&1 || error "Docker no está corriendo"

paso "Iniciando sesión en ECR"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRO" >/dev/null
ok "$REGISTRO"

construir() { # construir <nombre> <dockerfile> <contexto>
  local imagen="$REGISTRO/$PROYECTO/$1:latest"
  paso "Imagen $1"
  docker build --platform linux/amd64 --provenance=false --sbom=false -f "$2" -t "$imagen" "$3"
  # La subida a ECR a veces se corta (EOF) con capas grandes: hasta 4 intentos.
  local intento
  for intento in 1 2 3 4; do
    docker push -q "$imagen" >/dev/null && break
    [ "$intento" = 4 ] && error "No se pudo subir $1 a ECR después de 4 intentos"
    aviso "La subida de $1 se cortó (intento $intento); reintentando..."
    sleep 5
  done
  ok "subida: $PROYECTO/$1:latest"
}

# Backend: la misma imagen de siempre; en ECS se arranca sin --reload (lo indica la tarea).
for servicio in gateway servicio-postulantes servicio-empresas-vacantes servicio-procesos-seleccion servicio-comunicaciones; do
  construir "$servicio" "$RAIZ/backend/$servicio/Dockerfile" "$RAIZ/backend"
done
# Frontends: imagen de producción (next build, modo standalone).
construir erp "$RAIZ/frontend/ERP/Dockerfile.prod" "$RAIZ/frontend/ERP"
construir anuncios "$RAIZ/frontend/ANUNCIOS/Dockerfile.prod" "$RAIZ/frontend/ANUNCIOS"

if [ "$(estado_stack "$STACK_APP")" != NO_EXISTE ]; then
  paso "La app está prendida: reiniciando los servicios con las imágenes nuevas"
  for servicio in "${SERVICIOS[@]}"; do
    aws ecs update-service --cluster "$PROYECTO" --service "$servicio" --force-new-deployment >/dev/null
    ok "$servicio"
  done
  aws ecs wait services-stable --cluster "$PROYECTO" --services "${SERVICIOS[@]}"
  ok "Servicios actualizados"
fi
