# Funciones y variables comunes a los scripts de despliegue (se carga con ". $PSScriptRoot\comun.ps1",
# no se ejecuta sola). Compatible con Windows PowerShell 5.1 y PowerShell 7.
$ErrorActionPreference = 'Stop'

# aws.exe escribe en UTF-8: así se leen bien las tildes. Sin paginador (si no, se queda esperando).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = '1'
$env:AWS_PAGER = ''

$DirAws = $PSScriptRoot
$Raiz = (Resolve-Path (Join-Path $DirAws '..\..')).Path

# config.env: líneas CLAVE=valor (los # son comentarios).
$Config = @{}
foreach ($linea in Get-Content (Join-Path $DirAws 'config.env') -Encoding UTF8) {
    if ($linea -match '^\s*([A-Z_]+)=(.*)$') { $Config[$Matches[1]] = $Matches[2].Trim() }
}
$Proyecto = $Config.PROYECTO
$Region = $Config.REGION
$CorreoRemitente = $Config.CORREO_REMITENTE
$CorreoAlertas = $Config.CORREO_ALERTAS
$PresupuestoMensualUsd = $Config.PRESUPUESTO_MENSUAL_USD
$env:AWS_REGION = $Region
$env:AWS_DEFAULT_REGION = $Region
if ($Config.PERFIL_AWS) { $env:AWS_PROFILE = $Config.PERFIL_AWS }

# aws.exe por su ruta: las funciones de abajo se llaman Aws/AwsVer y PowerShell no distingue mayúsculas.
$AwsExe = Get-Command aws -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source

$StackBase = "$Proyecto-base"
$StackApp = "$Proyecto-app"
$IdBaseDatos = "$Proyecto-bd"
$Servicios = @('gateway', 'servicio-postulantes', 'servicio-empresas-vacantes', 'servicio-procesos-seleccion',
    'servicio-comunicaciones', 'erp', 'anuncios')

function Paso([string]$texto) { Write-Host ''; Write-Host "==> $texto" -ForegroundColor Cyan }
function Ok([string]$texto) { Write-Host "    [OK] $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "    [!] $texto" -ForegroundColor Yellow }
function Fallar([string]$texto) { Write-Host "    [X] $texto" -ForegroundColor Red; exit 1 }

# Ejecuta aws.exe y devuelve lo que imprime (texto). Si falla, corta el script con su error.
# Se usa para consultas; para los pasos largos (deploy, wait) está AwsVer.
function Aws {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'  # en PowerShell 5.1 el stderr de un .exe sería un error "fatal"
    try { $salida = & $AwsExe @args 2>&1 } finally { $ErrorActionPreference = $anterior }
    $errores = @($salida | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] })
    $texto = @($salida | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] })
    if ($LASTEXITCODE -ne 0) { Fallar "aws $($args -join ' ')`n        $(($errores | ForEach-Object { "$_" }) -join "`n        ")" }
    return (($texto | ForEach-Object { "$_" }) -join "`n").Trim()
}

# Igual que Aws, pero si falla devuelve $null en vez de cortar (para preguntar "¿existe?").
function AwsIntentar {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $salida = & $AwsExe @args 2>$null } finally { $ErrorActionPreference = $anterior }
    if ($LASTEXITCODE -ne 0) { return $null }
    return (($salida | ForEach-Object { "$_" }) -join "`n").Trim()
}

# Ejecuta aws.exe mostrando su avance en pantalla (pasos largos). Si falla, corta el script.
function AwsVer {
    & $AwsExe @args
    if ($LASTEXITCODE -ne 0) { Fallar "Falló: aws $($args -join ' ')" }
}

# Convierte una lista "en texto" de aws (separada por tabs o saltos de línea) en un arreglo.
function Lista([string]$texto) {
    if (-not $texto) { return @() }
    return @($texto -split '\s+' | Where-Object { $_ -and $_ -ne 'None' })
}

function Verificar-Credenciales {
    if (-not $AwsExe) { Fallar 'No está instalado AWS CLI (https://aws.amazon.com/cli/)' }
    $script:Cuenta = AwsIntentar sts get-caller-identity --query Account --output text
    $perfil = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { 'default' }
    if (-not $script:Cuenta) { Fallar "No hay sesión de AWS con el perfil $perfil. Ejecuta:  aws login --profile $perfil" }
    $script:Registro = "$($script:Cuenta).dkr.ecr.$Region.amazonaws.com"
    Ok "Cuenta AWS $($script:Cuenta.Substring(0, 4))******** · región $Region"
}

# Estado de un stack ("NO_EXISTE" si no está).
function Estado-Stack([string]$stack) {
    $estado = AwsIntentar cloudformation describe-stacks --stack-name $stack --query 'Stacks[0].StackStatus' --output text
    if ($estado) { return $estado } else { return 'NO_EXISTE' }
}

function Salida-Stack([string]$stack, [string]$clave) {
    return Aws cloudformation describe-stacks --stack-name $stack --query "Stacks[0].Outputs[?OutputKey=='$clave'].OutputValue" --output text
}

function Existe-Parametro([string]$nombre) {
    return [bool](AwsIntentar ssm get-parameter --name $nombre --query Parameter.Name --output text)
}

# Snapshots manuales de la base, del más nuevo al más viejo (solo los disponibles).
function Snapshots-BaseDatos {
    $texto = AwsIntentar rds describe-db-snapshots --db-instance-identifier $IdBaseDatos --snapshot-type manual `
        --query 'reverse(sort_by(DBSnapshots[?Status==`available`], &SnapshotCreateTime))[].DBSnapshotIdentifier' --output text
    return Lista $texto
}

# Despliega base.yaml (con el DNS del balanceador, si se pasa).
function Desplegar-Base([string]$albDns = '') {
    $parametros = @("Proyecto=$Proyecto", "CorreoRemitente=$CorreoRemitente", "CorreoAlertas=$CorreoAlertas",
        "PresupuestoMensualUSD=$PresupuestoMensualUsd")
    if ($albDns) { $parametros += "AlbDns=$albDns" }
    AwsVer cloudformation deploy --stack-name $StackBase --template-file (Join-Path $DirAws 'base.yaml') `
        --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset --tags "Proyecto=$Proyecto" `
        --parameter-overrides @parametros
}

# Reinicia los 7 servicios (toman la imagen :latest de ECR) y espera a que queden estables.
function Reiniciar-Servicios {
    foreach ($servicio in $Servicios) {
        Aws ecs update-service --cluster $Proyecto --service $servicio --force-new-deployment | Out-Null
        Ok $servicio
    }
    AwsVer ecs wait services-stable --cluster $Proyecto --services @Servicios
}
