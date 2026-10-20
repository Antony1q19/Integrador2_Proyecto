# APAGAR TalentERP (10-15 min).      .\infra\aws\apagar.ps1
#
# Borra el stack app (red, balanceador, servicios y base de datos). Antes de borrarse, la base
# guarda un SNAPSHOT FINAL con todos los datos: el próximo prender.ps1 la restaura tal cual.
# Queda solo el stack base (imágenes, documentos, URLs fijas): menos de US$ 1 al mes.
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales

$Alb = ''
$Nuevo = ''
if ((Estado-Stack $StackApp) -eq 'NO_EXISTE') {
    Ok 'Ya estaba apagado'
} else {
    $SnapshotsAntes = @(Snapshots-BaseDatos)
    $Alb = AwsIntentar cloudformation describe-stacks --stack-name $StackApp `
        --query "Stacks[0].Outputs[?OutputKey=='BalanceadorDns'].OutputValue" --output text
    Paso 'Borrando el stack app (la base guarda un snapshot final antes de borrarse)'
    Aws cloudformation delete-stack --stack-name $StackApp | Out-Null
    & $AwsExe cloudformation wait stack-delete-complete --stack-name $StackApp
    if ($LASTEXITCODE -ne 0) { Fallar "El stack no se pudo borrar. Revisa CloudFormation > $StackApp > Eventos." }
    Ok 'Stack app borrado'

    Paso 'Verificando el snapshot final'
    foreach ($intento in 1..60) {  # hasta 10 min
        $candidato = @(Snapshots-BaseDatos) | Select-Object -First 1
        if ($candidato -and ($SnapshotsAntes -notcontains $candidato)) { $Nuevo = $candidato; break }
        Start-Sleep -Seconds 10
    }
    if (-not $Nuevo) { Fallar 'No apareció el snapshot nuevo: NO se borran los anteriores (tus datos siguen en ellos).' }
    Ok "Snapshot final disponible: $Nuevo"

    # Solo se borran los viejos cuando el nuevo ya está disponible: siempre queda al menos una copia.
    foreach ($viejo in @(Snapshots-BaseDatos | Select-Object -Skip 1)) {
        Aws rds delete-db-snapshot --db-snapshot-identifier $viejo | Out-Null
        Ok "Snapshot anterior borrado: $viejo"
    }
}

Paso 'Comprobando que no quede nada cobrando por hora'
$Queda = $false
if (AwsIntentar rds describe-db-instances --db-instance-identifier $IdBaseDatos --query 'DBInstances[0].DBInstanceStatus' --output text) {
    Aviso 'La base de datos sigue existiendo'; $Queda = $true
} else {
    Ok 'Sin base de datos encendida'
}
if ($Alb -and (AwsIntentar elbv2 describe-load-balancers --query "LoadBalancers[?DNSName=='$Alb'].LoadBalancerName" --output text)) {
    Aviso "Queda el balanceador $Alb"; $Queda = $true
} else {
    Ok 'Sin balanceador'
}
$Clusters = AwsIntentar ecs describe-clusters --clusters $Proyecto --query 'clusters[?status==`ACTIVE`] | length(@)' --output text
if ($Clusters -and $Clusters -ne '0') {
    Aviso 'Queda el cluster ECS'; $Queda = $true
} else {
    Ok 'Sin servicios ECS'
}

Write-Host ''
if (-not $Queda) {
    $copia = if ($Nuevo) { $Nuevo } else { 'anterior' }
    Write-Host "  TalentERP está APAGADO. Tus datos quedan en el snapshot $copia." -ForegroundColor Green
    Write-Host '     Para volver a prenderlo:  .\infra\aws\prender.ps1'
} else {
    Write-Host '  Revisa los recursos marcados arriba en la consola de AWS.' -ForegroundColor Yellow
}
Write-Host ''
