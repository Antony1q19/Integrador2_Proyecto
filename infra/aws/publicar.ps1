# Construye las 7 imágenes de PRODUCCIÓN en AWS CodeBuild y las sube a ECR (no hace falta Docker).
#     .\infra\aws\publicar.ps1
# Comprime backend/ y frontend/ (solo lo que git no ignora), lo sube a S3, lanza el build y espera.
# Si la app está prendida, además reinicia los servicios para que usen las imágenes nuevas.
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

if ((Estado-Stack $StackBase) -eq 'NO_EXISTE') { Fallar 'Primero hay que crear el stack base (.\infra\aws\prender.ps1 lo crea)' }
$Bucket = AwsIntentar cloudformation describe-stacks --stack-name $StackBase --query "Stacks[0].Outputs[?OutputKey=='BucketCodigo'].OutputValue" --output text
if (-not $Bucket -or $Bucket -eq 'None') {
    Paso 'Agregando CodeBuild al stack base (solo la primera vez)'
    Desplegar-Base (Alb-Actual)
    $Bucket = Salida-Stack $StackBase 'BucketCodigo'
}
$ProyectoBuild = Salida-Stack $StackBase 'ProyectoBuild'

# ---------------------------------------------------------------------------------------------
Paso 'Comprimiendo el código'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fallar 'Falta git (se usa para saber qué archivos subir)' }
# Archivos versionados + nuevos no ignorados: nunca node_modules, .next, .env ni cachés.
$archivos = @(& git -C $Raiz ls-files --cached --others --exclude-standard -- backend frontend)
if ($LASTEXITCODE -ne 0 -or $archivos.Count -eq 0) { Fallar 'No se pudo listar el código con git' }
$Zip = Join-Path ([System.IO.Path]::GetTempPath()) "$Proyecto-codigo.zip"
Remove-Item $Zip -Force -ErrorAction SilentlyContinue
$destino = [System.IO.Compression.ZipFile]::Open($Zip, 'Create')
try {
    foreach ($relativo in $archivos) {
        $ruta = Join-Path $Raiz $relativo
        if (-not (Test-Path -LiteralPath $ruta -PathType Leaf)) { continue }  # borrado, aún sin confirmar en git
        # Nombre con "/" (no "\"): el zip se descomprime en Linux.
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($destino, $ruta, $relativo.Replace('\', '/'), 'Optimal') | Out-Null
    }
} finally {
    $destino.Dispose()
}
Ok ("{0} archivos, {1:N1} MB" -f $archivos.Count, ((Get-Item $Zip).Length / 1MB))

Paso 'Subiendo el código a S3'
Aws s3 cp $Zip "s3://$Bucket/codigo.zip" --only-show-errors | Out-Null
Remove-Item $Zip -Force -ErrorAction SilentlyContinue
Ok "s3://$Bucket/codigo.zip"

# ---------------------------------------------------------------------------------------------
Paso 'Construyendo las 7 imágenes en CodeBuild (8-12 min)'
$IdBuild = Aws codebuild start-build --project-name $ProyectoBuild --query build.id --output text
Ok "Build $IdBuild"
$faseAnterior = ''
while ($true) {
    Start-Sleep -Seconds 15
    $estado = (Aws codebuild batch-get-builds --ids $IdBuild --query 'builds[0].[buildStatus,currentPhase]' --output text) -split '\s+'
    if ($estado[1] -ne $faseAnterior) { Write-Host "    ... $($estado[1])"; $faseAnterior = $estado[1] }
    if ($estado[0] -ne 'IN_PROGRESS') { break }
}
if ($estado[0] -ne 'SUCCEEDED') {
    $stream = Aws codebuild batch-get-builds --ids $IdBuild --query 'builds[0].logs.streamName' --output text
    Write-Host ''
    Write-Host '    Últimas líneas del log:' -ForegroundColor Yellow
    $lineas = AwsIntentar logs get-log-events --log-group-name "/$Proyecto/build" --log-stream-name $stream --limit 40 --query 'events[].message' --output text
    if ($lineas) { $lineas -split "`t" | ForEach-Object { Write-Host "      $($_.TrimEnd())" } }
    Fallar "El build terminó en $($estado[0]). Log completo: CloudWatch > /$Proyecto/build > $stream"
}
Ok 'Imágenes subidas a ECR (:latest)'

if ((Estado-Stack $StackApp) -ne 'NO_EXISTE') {
    Paso 'La app está prendida: reiniciando los servicios con las imágenes nuevas'
    Reiniciar-Servicios
    Ok 'Servicios actualizados'
}
