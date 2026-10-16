#!/usr/bin/env bash
# APAGAR TalentERP (10-15 min).      bash infra/aws/apagar.sh
#
# Borra el stack app (red, balanceador, servicios y base de datos). Antes de borrarse, la base
# guarda un SNAPSHOT FINAL con todos los datos: el próximo prender.sh la restaura tal cual.
# Queda solo el stack base (imágenes, documentos, URLs fijas): menos de US$ 1 al mes.
source "$(dirname "$0")/comun.sh"
verificar_credenciales

ESTADO_APP=$(estado_stack "$STACK_APP")
if [ "$ESTADO_APP" = NO_EXISTE ]; then
  ok "Ya estaba apagado"
else
  SNAPSHOTS_ANTES=$(snapshots_base_datos)
  ALB=$(salida_stack "$STACK_APP" BalanceadorDns 2>/dev/null || true)
  paso "Borrando el stack app (la base guarda un snapshot final antes de borrarse)"
  aws cloudformation delete-stack --stack-name "$STACK_APP"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_APP" \
    || error "El stack no se pudo borrar. Revisa CloudFormation > $STACK_APP > Eventos."
  ok "Stack app borrado"

  paso "Verificando el snapshot final"
  NUEVO=""
  for _ in $(seq 1 60); do  # hasta 10 min
    NUEVO=$(snapshots_base_datos | head -1)
    if [ -n "$NUEVO" ] && ! grep -qx "$NUEVO" <<<"$SNAPSHOTS_ANTES"; then break; fi
    NUEVO=""; sleep 10
  done
  [ -n "$NUEVO" ] || error "No apareció el snapshot nuevo: NO se borran los anteriores (tus datos siguen en ellos)."
  ok "Snapshot final disponible: $NUEVO"

  # Solo se borran los viejos cuando el nuevo ya está disponible: siempre queda al menos una copia.
  for viejo in $(snapshots_base_datos | tail -n +2); do
    aws rds delete-db-snapshot --db-snapshot-identifier "$viejo" >/dev/null
    ok "Snapshot anterior borrado: $viejo"
  done
fi

paso "Comprobando que no quede nada cobrando por hora"
QUEDA=0
[ "$(aws rds describe-db-instances --db-instance-identifier "$ID_BASE_DATOS" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo NINGUNA)" = NINGUNA ] \
  && ok "Sin base de datos encendida" || { aviso "La base de datos sigue existiendo"; QUEDA=1; }
[ -z "${ALB:-}" ] || [ -z "$(aws elbv2 describe-load-balancers --query "LoadBalancers[?DNSName=='$ALB'].LoadBalancerName" --output text 2>/dev/null)" ] \
  && ok "Sin balanceador" || { aviso "Queda el balanceador $ALB"; QUEDA=1; }
[ "$(aws ecs describe-clusters --clusters "$PROYECTO" --query 'clusters[?status==`ACTIVE`] | length(@)' --output text 2>/dev/null || echo 0)" = 0 ] \
  && ok "Sin servicios ECS" || { aviso "Queda el cluster ECS"; QUEDA=1; }

if [ "$QUEDA" = 0 ]; then
  printf '\n  ✅ TalentERP está APAGADO. Tus datos quedan en el snapshot %s.\n     Para volver a prenderlo:  bash infra/aws/prender.sh\n\n' "${NUEVO:-anterior}"
else
  printf '\n  ⚠ Revisa los recursos marcados arriba en la consola de AWS.\n\n'
fi
