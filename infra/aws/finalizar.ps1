# FINALIZAR (fin del curso): borra TODO lo de TalentERP en AWS para que no cobre nunca más.
#     .\infra\aws\finalizar.ps1
#
# IRREVERSIBLE: se pierden la base de datos (y todos sus snapshots), los documentos de los
# postulantes, las imágenes, los secretos y los logs. Si quieres conservar algo, descárgalo antes.
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales

Write-Host ''
Write-Host "  Esto borra PARA SIEMPRE todo TalentERP en la cuenta $($Cuenta.Substring(0, 4))******** ($Region):" -ForegroundColor Yellow
Write-Host '     base de datos y snapshots, documentos (S3), imágenes (ECR), URLs (CloudFront),' -ForegroundColor Yellow
Write-Host '     secretos (SSM), correo (SES), logs y presupuesto.' -ForegroundColor Yellow
Write-Host ''
$Confirmacion = Read-Host '  Escribe BORRAR TODO para continuar'
if ($Confirmacion -cne 'BORRAR TODO') { Fallar 'Cancelado: no se borró nada.' }

# ---------------------------------------------------------------------------------------------
if ((Estado-Stack $StackApp) -ne 'NO_EXISTE') {
    Paso 'Borrando el stack app'
    Aws cloudformation delete-stack --stack-name $StackApp | Out-Null
    AwsVer cloudformation wait stack-delete-complete --stack-name $StackApp
    Ok 'Stack app borrado'
}

Paso 'Borrando los snapshots de la base de datos'
# Puede tardar un poco en aparecer el snapshot final del stack recién borrado: se espera.
foreach ($intento in 1..30) {
    $creando = AwsIntentar rds describe-db-snapshots --db-instance-identifier $IdBaseDatos --snapshot-type manual `
        --query 'DBSnapshots[?Status==`creating`].DBSnapshotIdentifier' --output text
    if (-not (Lista $creando)) { break }
    Start-Sleep -Seconds 10
}
$Todos = AwsIntentar rds describe-db-snapshots --db-instance-identifier $IdBaseDatos --snapshot-type manual `
    --query 'DBSnapshots[].DBSnapshotIdentifier' --output text
foreach ($snapshot in @(Lista $Todos)) {
    Aws rds delete-db-snapshot --db-snapshot-identifier $snapshot | Out-Null
    Ok $snapshot
}

# ---------------------------------------------------------------------------------------------
if ((Estado-Stack $StackBase) -ne 'NO_EXISTE') {
    $Bucket = Salida-Stack $StackBase 'BucketDocumentos'
    Paso "Vaciando y borrando el bucket de documentos ($Bucket)"
    if ($Bucket -and $null -ne (AwsIntentar s3api head-bucket --bucket $Bucket)) {
        AwsVer s3 rm "s3://$Bucket" --recursive --only-show-errors
        Aws s3api delete-bucket --bucket $Bucket | Out-Null
    }
    Ok 'Bucket borrado'

    Paso 'Borrando el stack base (CloudFront tarda ~15 min en borrarse)'
    Aws cloudformation delete-stack --stack-name $StackBase | Out-Null
    & $AwsExe cloudformation wait stack-delete-complete --stack-name $StackBase
    if ($LASTEXITCODE -ne 0) { Fallar "No se pudo borrar el stack base. Revisa CloudFormation > $StackBase > Eventos y vuelve a ejecutar." }
    Ok 'Stack base borrado (imágenes, CloudFront, correo, permisos, logs y presupuesto)'
}

# ---------------------------------------------------------------------------------------------
Paso 'Borrando los secretos de SSM'
$Nombres = @(Lista (Aws ssm get-parameters-by-path --path "/$Proyecto" --recursive --query 'Parameters[].Name' --output text))
# delete-parameters acepta hasta 10 nombres por llamada
for ($i = 0; $i -lt $Nombres.Count; $i += 10) {
    $lote = @($Nombres[$i..([Math]::Min($i + 9, $Nombres.Count - 1))])
    Aws ssm delete-parameters --names @lote | Out-Null
}
Ok 'Secretos borrados'

Paso 'Borrando logs que hayan quedado'
foreach ($grupo in @(Lista (Aws logs describe-log-groups --log-group-name-prefix "/$Proyecto" --query 'logGroups[].logGroupName' --output text))) {
    Aws logs delete-log-group --log-group-name $grupo | Out-Null
    Ok $grupo
}

# ---------------------------------------------------------------------------------------------
Paso 'Comprobación final'
$Restantes = @(Lista (AwsIntentar resourcegroupstaggingapi get-resources --tag-filters "Key=Proyecto,Values=$Proyecto" `
        --query 'ResourceTagMappingList[].ResourceARN' --output text))
Write-Host ''
if ($Restantes.Count -eq 0) {
    Write-Host '  No queda ningún recurso de TalentERP en AWS. No se cobrará nada más.' -ForegroundColor Green
} else {
    Aviso 'Aún aparecen estos recursos (a veces la lista tarda unos minutos en actualizarse):'
    $Restantes | ForEach-Object { Write-Host "      $_" }
    Write-Host ''
    Write-Host '  Vuelve a ejecutar este script en unos minutos para confirmar.'
}
Write-Host ''
