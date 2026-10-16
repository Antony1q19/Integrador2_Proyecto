#!/usr/bin/env bash
# Sube los SECRETOS a SSM Parameter Store (cifrados). Se ejecuta una vez (prender.sh lo llama solo
# si faltan) y cada vez que cambie un secreto, por ejemplo el token de Meta:
#     bash infra/aws/configurar.sh
# Toma los valores de los .env locales (que git ignora). La contraseña de la base se genera una
# sola vez y nunca se sobrescribe (la base restaurada desde un snapshot sigue usando la misma).
source "$(dirname "$0")/comun.sh"
verificar_credenciales

ENV_GATEWAY="$RAIZ/backend/gateway/.env"
ENV_COMUNICACIONES="$RAIZ/backend/servicio-comunicaciones/.env"
ENV_MIGRACION="$DIR_AWS/.migracion.env"

poner() { # poner <nombre> <valor> [String|SecureString]
  local nombre="/$PROYECTO/$1" valor="$2" tipo="${3:-SecureString}"
  if [ -z "$valor" ]; then aviso "Sin valor para $nombre (se omite)"; return; fi
  aws ssm put-parameter --name "$nombre" --value "$valor" --type "$tipo" --overwrite >/dev/null
  ok "$nombre"
}

paso "Secretos del sistema"
if existe_parametro "/$PROYECTO/bd/password"; then
  ok "/$PROYECTO/bd/password (ya existe: no se cambia)"
else
  poner bd/password "$(python -c 'import secrets; print(secrets.token_urlsafe(24))')"
fi
poner jwt-secret "$(leer_env "$ENV_GATEWAY" JWT_SECRET)"
poner gateway-shared-secret "$(leer_env "$ENV_GATEWAY" GATEWAY_SHARED_SECRET)"
poner frontend-proxy-secret "$(leer_env "$ENV_GATEWAY" FRONTEND_PROXY_SECRET)"

paso "WhatsApp (Meta)"
poner meta/access-token "$(leer_env "$ENV_COMUNICACIONES" META_ACCESS_TOKEN)"
poner meta/verify-token "$(leer_env "$ENV_COMUNICACIONES" META_VERIFY_TOKEN)"
poner meta/phone-number-id "$(leer_env "$ENV_COMUNICACIONES" META_PHONE_NUMBER_ID)" String
poner meta/waba-id "$(leer_env "$ENV_COMUNICACIONES" META_WABA_ID)" String
SECRETO_APP="$(leer_env "$ENV_COMUNICACIONES" META_APP_SECRET)"
if [ -n "$SECRETO_APP" ]; then
  poner meta/app-secret "$SECRETO_APP"
else
  poner meta/app-secret "PENDIENTE-CONFIGURAR"
  aviso "META_APP_SECRET vacío: el webhook RECHAZARÁ los mensajes de WhatsApp hasta que pongas la"
  aviso "clave secreta de la app (Meta > Configuración de la app > Básica) en el .env y vuelvas a ejecutar este script."
fi

if [ -f "$ENV_MIGRACION" ]; then
  paso "Datos para la migración única desde Supabase"
  poner migracion/supabase-personas "$(leer_env "$ENV_MIGRACION" SUPABASE_PERSONAS_URL)"
  poner migracion/supabase-reclutamiento "$(leer_env "$ENV_MIGRACION" SUPABASE_RECLUTAMIENTO_URL)"
fi

paso "Listo"
