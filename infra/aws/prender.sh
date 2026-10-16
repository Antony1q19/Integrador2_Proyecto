#!/usr/bin/env bash
# PRENDER TalentERP en AWS (15-20 min).      bash infra/aws/prender.sh
#
#  1. Crea/actualiza el stack base (ECR, S3, CloudFront, SES, permisos, presupuesto).
#  2. Sube los secretos a SSM y las imágenes a ECR si todavía no están.
#  3. Crea el stack app restaurando la base de datos desde el ÚLTIMO snapshot (tus datos).
#     La primera vez no hay snapshot: crea la base y copia ahí los datos y archivos de Supabase.
#  4. Apunta CloudFront al balanceador nuevo y espera a que los 7 servicios estén sanos.
# Mientras está prendido cobra ~US$ 0.20 por hora: al terminar, ejecuta apagar.sh.
source "$(dirname "$0")/comun.sh"
verificar_credenciales
INICIO=$(date +%s)

# ---------------------------------------------------------------------------------------------
paso "1/5 Stack base ($STACK_BASE)"
aws cloudformation deploy --stack-name "$STACK_BASE" --template-file "$DIR_AWS/base.yaml" \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
  --tags "Proyecto=$PROYECTO" \
  --parameter-overrides "Proyecto=$PROYECTO" "CorreoRemitente=$CORREO_REMITENTE" \
    "CorreoAlertas=$CORREO_ALERTAS" "PresupuestoMensualUSD=$PRESUPUESTO_MENSUAL_USD"
ok "Stack base listo"
BUCKET=$(salida_stack "$STACK_BASE" BucketDocumentos)

ESTADO_CORREO=$(aws sesv2 get-email-identity --email-identity "$CORREO_REMITENTE" --query VerificationStatus --output text 2>/dev/null || echo PENDING)
[ "$ESTADO_CORREO" = SUCCESS ] && ok "Correo $CORREO_REMITENTE verificado en SES" \
  || aviso "Revisa $CORREO_REMITENTE y haz clic en el enlace de Amazon SES (sin eso no salen los correos)"

# ---------------------------------------------------------------------------------------------
paso "2/5 Secretos e imágenes"
existe_parametro "/$PROYECTO/jwt-secret" && ok "Secretos en SSM" || bash "$DIR_AWS/configurar.sh"
FALTAN_IMAGENES=0
for servicio in "${SERVICIOS[@]}"; do
  aws ecr describe-images --repository-name "$PROYECTO/$servicio" --image-ids imageTag=latest >/dev/null 2>&1 || FALTAN_IMAGENES=1
done
if [ "$FALTAN_IMAGENES" = 1 ]; then bash "$DIR_AWS/publicar.sh"; else ok "Imágenes en ECR"; fi

# ---------------------------------------------------------------------------------------------
paso "3/5 Stack app ($STACK_APP)"
# Una cuenta que nunca usó ECS no tiene su "rol vinculado al servicio": se crea una vez (si ya existe, nada).
if ! aws iam get-role --role-name AWSServiceRoleForECS >/dev/null 2>&1; then
  aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com >/dev/null
  ok "Rol vinculado de ECS creado (primera vez en la cuenta); esperando a que esté listo"
  sleep 20
fi

ESTADO_APP=$(estado_stack "$STACK_APP")
# Un intento anterior que falló al CREARSE queda en ROLLBACK_COMPLETE: no se puede actualizar, se borra.
if [ "$ESTADO_APP" = ROLLBACK_COMPLETE ] || [ "$ESTADO_APP" = CREATE_FAILED ]; then
  aviso "Quedó un intento fallido ($ESTADO_APP): se borra y se vuelve a crear"
  aws cloudformation delete-stack --stack-name "$STACK_APP"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_APP"
  ESTADO_APP=NO_EXISTE
fi
PREFIJOS=$(aws ec2 describe-managed-prefix-lists \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
  --query 'PrefixLists[0].PrefixListId' --output text)
VERSION_PG=$(aws rds describe-db-engine-versions --engine postgres \
  --query "DBEngineVersions[?starts_with(EngineVersion, '17.')].EngineVersion" --output text \
  | tr '\t' '\n' | sort -V | tail -1)

desplegar_app() { # desplegar_app <snapshot> <cantidad-tareas>
  aws cloudformation deploy --stack-name "$STACK_APP" --template-file "$DIR_AWS/app.yaml" \
    --no-fail-on-empty-changeset --tags "Proyecto=$PROYECTO" \
    --parameter-overrides "Proyecto=$PROYECTO" "SnapshotId=$1" "CantidadTareas=$2" \
      "ListaPrefijosCloudFront=$PREFIJOS" "VersionPostgres=$VERSION_PG"
}

if [ "$ESTADO_APP" != NO_EXISTE ]; then
  [[ "$ESTADO_APP" == *_COMPLETE ]] || error "El stack app está en estado $ESTADO_APP. Espera o revisa CloudFormation."
  ok "Ya estaba prendido ($ESTADO_APP)"
else
  SNAPSHOT=$(snapshots_base_datos | head -1)
  # Mientras la migración desde Supabase esté pendiente, un snapshot solo puede venir de un intento
  # fallido (base vacía): se ignora, para no "restaurar" una base sin tus datos.
  if existe_parametro "/$PROYECTO/migracion/supabase-personas" && [ -n "$SNAPSHOT" ]; then
    aviso "Se ignora el snapshot $SNAPSHOT: la migración inicial todavía no se completó"
    SNAPSHOT=""
  fi
  if [ -n "$SNAPSHOT" ]; then
    ok "Restaurando la base desde el snapshot $SNAPSHOT (10-15 min)"
    desplegar_app "$SNAPSHOT" 1
  else
    aviso "No hay snapshot: es la PRIMERA vez. Se crea la base (PostgreSQL $VERSION_PG) vacía."
    desplegar_app "" 0

    if existe_parametro "/$PROYECTO/migracion/supabase-personas"; then
      paso "Migración única: datos de Supabase → RDS"
      SUBREDES=$(salida_stack "$STACK_APP" SubredesTareas)
      SG=$(salida_stack "$STACK_APP" GrupoSeguridadServicios)
      TAREA=$(aws ecs run-task --cluster "$PROYECTO" --launch-type FARGATE \
        --task-definition "$(salida_stack "$STACK_APP" TareaMigracion)" \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBREDES],securityGroups=[$SG],assignPublicIp=ENABLED}" \
        --query 'tasks[0].taskArn' --output text)
      aws ecs wait tasks-stopped --cluster "$PROYECTO" --tasks "$TAREA"
      CODIGO=$(aws ecs describe-tasks --cluster "$PROYECTO" --tasks "$TAREA" --query 'tasks[0].containers[0].exitCode' --output text)
      if [ "$CODIGO" != 0 ]; then
        aws logs tail "/$PROYECTO/migracion" --since 30m | tail -20
        error "La migración de datos falló (código $CODIGO). Los servicios siguen apagados; revisa el log de arriba."
      fi
      ok "Datos copiados a RDS"

      paso "Migración única: archivos de Supabase Storage → S3"
      python "$DIR_AWS/migrar_archivos.py" "$BUCKET"
      ok "Archivos copiados"

      aws ssm delete-parameters --names "/$PROYECTO/migracion/supabase-personas" "/$PROYECTO/migracion/supabase-reclutamiento" >/dev/null
      ok "Credenciales de Supabase borradas de AWS (la migración ya no se repite)"
    else
      aviso "Sin datos de Supabase para migrar: la base queda vacía (con las tablas)."
    fi

    paso "Encendiendo los 7 servicios"
    desplegar_app "" 1
  fi
fi
ok "Stack app listo"

# ---------------------------------------------------------------------------------------------
paso "4/5 CloudFront → balanceador nuevo (3-5 min)"
ALB=$(salida_stack "$STACK_APP" BalanceadorDns)
aws cloudformation deploy --stack-name "$STACK_BASE" --template-file "$DIR_AWS/base.yaml" \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset --tags "Proyecto=$PROYECTO" \
  --parameter-overrides "Proyecto=$PROYECTO" "CorreoRemitente=$CORREO_REMITENTE" \
    "CorreoAlertas=$CORREO_ALERTAS" "PresupuestoMensualUSD=$PRESUPUESTO_MENSUAL_USD" "AlbDns=$ALB"
ok "CloudFront apunta a $ALB"

# ---------------------------------------------------------------------------------------------
paso "5/5 Esperando que los servicios estén sanos"
aws ecs wait services-stable --cluster "$PROYECTO" --services "${SERVICIOS[@]}"
# Service Connect: cada tarea solo conoce los nombres (gateway, servicio-postulantes...) de los
# servicios que ya estaban registrados cuando ELLA arrancó. Como los 7 arrancan a la vez, algunos no
# se ven entre sí: se reinician una vez, ya con todos registrados, y así todos se encuentran.
for servicio in "${SERVICIOS[@]}"; do
  aws ecs update-service --cluster "$PROYECTO" --service "$servicio" --force-new-deployment >/dev/null
done
aws ecs wait services-stable --cluster "$PROYECTO" --services "${SERVICIOS[@]}"
ok "Los 7 servicios están corriendo y conectados entre sí"

URL_ERP=$(salida_stack "$STACK_BASE" UrlErp)
URL_ANUNCIOS=$(salida_stack "$STACK_BASE" UrlAnuncios)
URL_WEBHOOK=$(salida_stack "$STACK_BASE" UrlWebhookWhatsApp)
cat <<FIN

  ✅ TalentERP está PRENDIDO  ($(( ($(date +%s) - INICIO) / 60 )) min)

     ERP ............ $URL_ERP
     Portal empleos . $URL_ANUNCIOS
     Webhook Meta ... $URL_WEBHOOK

  Cobra ~US\$ 0.20 por hora. Al terminar:   bash infra/aws/apagar.sh
FIN
