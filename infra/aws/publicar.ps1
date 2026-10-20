# Construye las 7 imágenes de PRODUCCIÓN y las sube a ECR. Ejecutar cada vez que cambie el código:
#     .\infra\aws\publicar.ps1
# Si la app está prendida, además reinicia los servicios para que usen las imágenes nuevas.
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales

if ((Estado-Stack $StackBase) -eq 'NO_EXISTE') { Fallar 'Primero hay que crear el stack base (.\infra\aws\prender.ps1 lo crea)' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fallar 'No está instalado Docker Desktop (lo necesita ECS: corre imágenes de contenedor)' }
$ErrorActionPreference = 'Continue'  # en PowerShell 5.1, redirigir el stderr de un .exe con 'Stop' corta el script
& docker info *> $null
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -ne 0) { Fallar 'Docker Desktop no está encendido' }

Paso 'Iniciando sesión en ECR'
$clave = Aws ecr get-login-password
$clave | & docker login --username AWS --password-stdin $Registro | Out-Null
if ($LASTEXITCODE -ne 0) { Fallar 'No se pudo iniciar sesión en ECR' }
Ok $Registro

function Construir([string]$nombre, [string]$dockerfile, [string]$contexto) {
    $imagen = "$Registro/$Proyecto/${nombre}:latest"
    Paso "Imagen $nombre"
    & docker build --platform linux/amd64 --provenance=false --sbom=false -f $dockerfile -t $imagen $contexto
    if ($LASTEXITCODE -ne 0) { Fallar "No se pudo construir la imagen $nombre" }
    # La subida a ECR a veces se corta (EOF) con capas grandes: hasta 4 intentos.
    foreach ($intento in 1..4) {
        & docker push -q $imagen | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        if ($intento -eq 4) { Fallar "No se pudo subir $nombre a ECR después de 4 intentos" }
        Aviso "La subida de $nombre se cortó (intento $intento); reintentando..."
        Start-Sleep -Seconds 5
    }
    Ok "subida: $Proyecto/${nombre}:latest"
}

# Backend: se construyen desde la carpeta backend/ (incluye el código compartido de libs/).
foreach ($servicio in 'gateway', 'servicio-postulantes', 'servicio-empresas-vacantes', 'servicio-procesos-seleccion', 'servicio-comunicaciones') {
    Construir $servicio (Join-Path $Raiz "backend\$servicio\Dockerfile") (Join-Path $Raiz 'backend')
}
# Frontends: next build en modo standalone.
Construir 'erp' (Join-Path $Raiz 'frontend\ERP\Dockerfile') (Join-Path $Raiz 'frontend\ERP')
Construir 'anuncios' (Join-Path $Raiz 'frontend\ANUNCIOS\Dockerfile') (Join-Path $Raiz 'frontend\ANUNCIOS')

if ((Estado-Stack $StackApp) -ne 'NO_EXISTE') {
    Paso 'La app está prendida: reiniciando los servicios con las imágenes nuevas'
    Reiniciar-Servicios
    Ok 'Servicios actualizados'
}
