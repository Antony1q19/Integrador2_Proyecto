#!/usr/bin/env bash
# FINALIZAR (fin del curso): borra TODO lo de TalentERP en AWS para que no cobre nunca más.
#     bash infra/aws/finalizar.sh
#
# ⚠ IRREVERSIBLE: se pierden la base de datos (y todos sus snapshots), los documentos de los
# postulantes, las imágenes, los secretos y los logs. Si quieres conservar algo, descárgalo antes.
source "$(dirname "$0")/comun.sh"
verificar_credenciales

cat <<AVISO

  ⚠  Esto borra PARA SIEMPRE todo TalentERP en la cuenta ${CUENTA:0:4}******** ($REGION):
     base de datos y snapshots, documentos (S3), imágenes (ECR), URLs (CloudFront),
     secretos (SSM), correo (SES), logs y presupuesto.

AVISO
read -r -p "  Escribe BORRAR TODO para continuar: " CONFIRMACION
[ "$CONFIRMACION" = "BORRAR TODO" ] || error "Cancelado: no se borró nada."

# ---------------------------------------------------------------------------------------------
if [ "$(estado_stack "$STACK_APP")" != NO_EXISTE ]; then
  paso "Borrando el stack app"
  aws cloudformation delete-stack --stack-name "$STACK_APP"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_APP"
  ok "Stack app borrado"
fi

paso "Borrando los snapshots de la base de datos"
# Puede tardar un poco en aparecer el snapshot final del stack recién borrado: se espera.
for _ in $(seq 1 30); do
  [ -z "$(aws rds describe-db-snapshots --db-instance-identifier "$ID_BASE_DATOS" --snapshot-type manual \
      --query 'DBSnapshots[?Status==`creating`].DBSnapshotIdentifier' --output text 2>/dev/null)" ] && break
  sleep 10
done
for snapshot in $(aws rds describe-db-snapshots --db-instance-identifier "$ID_BASE_DATOS" --snapshot-type manual \
    --query 'DBSnapshots[].DBSnapshotIdentifier' --output text 2>/dev/null); do
  aws rds delete-db-snapshot --db-snapshot-identifier "$snapshot" >/dev/null
  ok "$snapshot"
done

# ---------------------------------------------------------------------------------------------
if [ "$(estado_stack "$STACK_BASE")" != NO_EXISTE ]; then
  BUCKET=$(salida_stack "$STACK_BASE" BucketDocumentos)
  paso "Vaciando y borrando el bucket de documentos ($BUCKET)"
  if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    aws s3 rm "s3://$BUCKET" --recursive --only-show-errors
    aws s3api delete-bucket --bucket "$BUCKET"
  fi
  ok "Bucket borrado"

  paso "Borrando el stack base (CloudFront tarda ~15 min en borrarse)"
  aws cloudformation delete-stack --stack-name "$STACK_BASE"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_BASE" \
    || error "No se pudo borrar el stack base. Revisa CloudFormation > $STACK_BASE > Eventos y vuelve a ejecutar."
  ok "Stack base borrado (imágenes, CloudFront, correo, permisos, logs y presupuesto)"
fi

# ---------------------------------------------------------------------------------------------
paso "Borrando los secretos de SSM"
NOMBRES=$(aws ssm get-parameters-by-path --path "/$PROYECTO" --recursive --query 'Parameters[].Name' --output text | tr '\t' '\n' | sed '/^$/d')
if [ -n "$NOMBRES" ]; then
  # delete-parameters acepta hasta 10 nombres por llamada
  echo "$NOMBRES" | xargs -n 10 aws ssm delete-parameters --names >/dev/null
fi
ok "Secretos borrados"

paso "Borrando logs que hayan quedado"
for grupo in $(aws logs describe-log-groups --log-group-name-prefix "/$PROYECTO" --query 'logGroups[].logGroupName' --output text); do
  aws logs delete-log-group --log-group-name "$grupo"
  ok "$grupo"
done

rm -f "$DIR_AWS/.migracion.env"

# ---------------------------------------------------------------------------------------------
paso "Comprobación final"
RESTANTES=$(aws resourcegroupstaggingapi get-resources --tag-filters "Key=Proyecto,Values=$PROYECTO" \
  --query 'ResourceTagMappingList[].ResourceARN' --output text 2>/dev/null | tr '\t' '\n' | sed '/^$/d' || true)
if [ -z "$RESTANTES" ]; then
  printf '\n  ✅ No queda ningún recurso de TalentERP en AWS. No se cobrará nada más.\n\n'
else
  aviso "Aún aparecen estos recursos (a veces la lista tarda unos minutos en actualizarse):"
  echo "$RESTANTES" | sed 's/^/      /'
  printf '\n  Vuelve a ejecutar este script en unos minutos para confirmar.\n\n'
fi
