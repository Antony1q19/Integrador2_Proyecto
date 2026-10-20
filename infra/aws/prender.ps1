# PRENDER TalentERP en AWS (15-20 min).      .\infra\aws\prender.ps1
#
#  1. Crea/actualiza el stack base (ECR, S3, CloudFront, SES, permisos, presupuesto).
#  2. Sube los secretos a SSM y las imágenes a ECR si todavía no están.
#  3. Crea el stack app restaurando la base de datos desde el ÚLTIMO snapshot (tus datos).
#     Si no hay ningún snapshot, crea la base vacía (los servicios crean sus tablas al arrancar).
#  4. Apunta CloudFront al balanceador nuevo y espera a que los 7 servicios estén sanos.
# Mientras está prendido cobra ~US$ 0.20 por hora: al terminar, ejecuta apagar.ps1.
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales
$Inicio = Get-Date

# ---------------------------------------------------------------------------------------------
Paso "1/5 Stack base ($StackBase)"
Desplegar-Base
Ok 'Stack base listo'

$EstadoCorreo = AwsIntentar sesv2 get-email-identity --email-identity $CorreoRemitente --query VerificationStatus --output text
if ($EstadoCorreo -eq 'SUCCESS') {
    Ok "Correo $CorreoRemitente verificado en SES"
} else {
    Aviso "Revisa $CorreoRemitente y haz clic en el enlace de Amazon SES (sin eso no salen los correos)"
}

# ---------------------------------------------------------------------------------------------
Paso '2/5 Secretos e imágenes'
if (Existe-Parametro "/$Proyecto/jwt-secret") {
    Ok 'Secretos en SSM'
} else {
    & "$DirAws\configurar.ps1"
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
$FaltanImagenes = $false
foreach ($servicio in $Servicios) {
    if (-not (AwsIntentar ecr describe-images --repository-name "$Proyecto/$servicio" --image-ids imageTag=latest)) { $FaltanImagenes = $true }
}
if ($FaltanImagenes) {
    & "$DirAws\publicar.ps1"
    if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
    Ok 'Imágenes en ECR'
}

# ---------------------------------------------------------------------------------------------
Paso "3/5 Stack app ($StackApp)"
# Una cuenta que nunca usó ECS no tiene su "rol vinculado al servicio": se crea una vez (si ya existe, nada).
if (-not (AwsIntentar iam get-role --role-name AWSServiceRoleForECS)) {
    Aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com | Out-Null
    Ok 'Rol vinculado de ECS creado (primera vez en la cuenta); esperando a que esté listo'
    Start-Sleep -Seconds 20
}

$EstadoApp = Estado-Stack $StackApp
# Un intento anterior que falló al CREARSE queda en ROLLBACK_COMPLETE: no se puede actualizar, se borra.
if ($EstadoApp -eq 'ROLLBACK_COMPLETE' -or $EstadoApp -eq 'CREATE_FAILED') {
    Aviso "Quedó un intento fallido ($EstadoApp): se borra y se vuelve a crear"
    Aws cloudformation delete-stack --stack-name $StackApp | Out-Null
    AwsVer cloudformation wait stack-delete-complete --stack-name $StackApp
    $EstadoApp = 'NO_EXISTE'
}

if ($EstadoApp -ne 'NO_EXISTE') {
    if (-not $EstadoApp.EndsWith('_COMPLETE')) { Fallar "El stack app está en estado $EstadoApp. Espera o revisa CloudFormation." }
    Ok "Ya estaba prendido ($EstadoApp)"
} else {
    $Prefijos = Aws ec2 describe-managed-prefix-lists `
        --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing `
        --query 'PrefixLists[0].PrefixListId' --output text
    $VersionPg = Lista (Aws rds describe-db-engine-versions --engine postgres `
            --query "DBEngineVersions[?starts_with(EngineVersion, '17.')].EngineVersion" --output text) |
        Sort-Object { [version]$_ } | Select-Object -Last 1

    $Snapshot = @(Snapshots-BaseDatos) | Select-Object -First 1
    if ($Snapshot) {
        Ok "Restaurando la base desde el snapshot $Snapshot (10-15 min)"
    } else {
        Aviso "No hay snapshot: se crea la base (PostgreSQL $VersionPg) vacía."
        $Snapshot = ''
    }
    AwsVer cloudformation deploy --stack-name $StackApp --template-file (Join-Path $DirAws 'app.yaml') `
        --no-fail-on-empty-changeset --tags "Proyecto=$Proyecto" `
        --parameter-overrides "Proyecto=$Proyecto" "SnapshotId=$Snapshot" 'CantidadTareas=1' `
        "ListaPrefijosCloudFront=$Prefijos" "VersionPostgres=$VersionPg"
}
Ok 'Stack app listo'

# ---------------------------------------------------------------------------------------------
Paso '4/5 CloudFront -> balanceador nuevo (3-5 min)'
$Alb = Salida-Stack $StackApp 'BalanceadorDns'
Desplegar-Base $Alb
Ok "CloudFront apunta a $Alb"

# ---------------------------------------------------------------------------------------------
Paso '5/5 Esperando que los servicios estén sanos'
AwsVer ecs wait services-stable --cluster $Proyecto --services @Servicios
# Service Connect: cada tarea solo conoce los nombres (gateway, servicio-postulantes...) de los
# servicios que ya estaban registrados cuando ELLA arrancó. Como los 7 arrancan a la vez, algunos no
# se ven entre sí: se reinician una vez, ya con todos registrados, y así todos se encuentran.
Reiniciar-Servicios
Ok 'Los 7 servicios están corriendo y conectados entre sí'

$UrlErp = Salida-Stack $StackBase 'UrlErp'
$UrlAnuncios = Salida-Stack $StackBase 'UrlAnuncios'
$UrlWebhook = Salida-Stack $StackBase 'UrlWebhookWhatsApp'
$Minutos = [int]((Get-Date) - $Inicio).TotalMinutes
Write-Host ''
Write-Host "  TalentERP está PRENDIDO  ($Minutos min)" -ForegroundColor Green
Write-Host ''
Write-Host "     ERP ............ $UrlErp"
Write-Host "     Portal empleos . $UrlAnuncios"
Write-Host "     Webhook Meta ... $UrlWebhook"
Write-Host ''
Write-Host '  Cobra ~US$ 0.20 por hora. Al terminar:   .\infra\aws\apagar.ps1'
Write-Host ''
