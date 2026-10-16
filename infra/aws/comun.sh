#!/usr/bin/env bash
# Funciones y variables comunes a los scripts de despliegue (se carga con "source", no se ejecuta).
set -euo pipefail

# Git Bash en Windows convierte "/talenterp/..." en una ruta de Windows: se desactiva.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
export AWS_PAGER=""

# En Git Bash, "pwd -W" da la ruta de Windows (C:/...): la entienden aws.exe, docker y python.
DIR_AWS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && (pwd -W 2>/dev/null || pwd))"
RAIZ="$(cd "$DIR_AWS/../.." && (pwd -W 2>/dev/null || pwd))"
# shellcheck disable=SC1091
source "$DIR_AWS/config.env"
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"
[ -n "${PERFIL_AWS:-}" ] && export AWS_PROFILE="$PERFIL_AWS"

STACK_BASE="$PROYECTO-base"
STACK_APP="$PROYECTO-app"
ID_BASE_DATOS="$PROYECTO-bd"
SERVICIOS=(gateway servicio-postulantes servicio-empresas-vacantes servicio-procesos-seleccion servicio-comunicaciones erp anuncios)

paso() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m    ✓ %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m    ! %s\033[0m\n' "$*"; }
error() { printf '\033[1;31m    ✗ %s\033[0m\n' "$*" >&2; exit 1; }

verificar_credenciales() {
  command -v aws >/dev/null || error "No está instalado AWS CLI"
  CUENTA="$(aws sts get-caller-identity --query Account --output text 2>/dev/null)" \
    || error "No hay sesión de AWS con el perfil ${AWS_PROFILE:-default}. Ejecuta:  aws login --profile ${AWS_PROFILE:-default}"
  REGISTRO="$CUENTA.dkr.ecr.$REGION.amazonaws.com"
  ok "Cuenta AWS ${CUENTA:0:4}******** · región $REGION"
}

# Estado de un stack ("NO_EXISTE" si no está).
estado_stack() {
  aws cloudformation describe-stacks --stack-name "$1" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NO_EXISTE
}

salida_stack() {
  aws cloudformation describe-stacks --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text
}

existe_parametro() {
  aws ssm get-parameter --name "$1" --query Parameter.Name --output text >/dev/null 2>&1
}

# Snapshots manuales de la base, del más nuevo al más viejo (solo los disponibles).
snapshots_base_datos() {
  aws rds describe-db-snapshots --db-instance-identifier "$ID_BASE_DATOS" --snapshot-type manual \
    --query 'reverse(sort_by(DBSnapshots[?Status==`available`], &SnapshotCreateTime))[].DBSnapshotIdentifier' \
    --output text 2>/dev/null | tr '\t' '\n' | sed '/^$/d;/^None$/d' || true
}

# Lee una variable de un archivo .env (sin ejecutarlo).
leer_env() {
  local archivo="$1" clave="$2"
  [ -f "$archivo" ] || return 0
  grep -E "^${clave}=" "$archivo" | head -1 | cut -d= -f2- | tr -d '\r'
}
