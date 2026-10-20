# SECRETOS de TalentERP en SSM Parameter Store (cifrados). SSM es la ÚNICA fuente: no hay archivos .env.
#
#     .\infra\aws\configurar.ps1               crea lo que falte (prender.ps1 lo llama solo la primera vez)
#     .\infra\aws\configurar.ps1 -Meta         vuelve a pedir los datos de WhatsApp (ej. token nuevo)
#     .\infra\aws\configurar.ps1 -RotarClaves  genera claves internas nuevas (cierra todas las sesiones)
#
# Las claves internas (contraseña de la base, JWT, firma del Gateway, clave de los frontends) se
# generan solas: nadie necesita conocerlas. Los datos de Meta se escriben por consola (los secretos
# no se ven al escribirlos). Si la app está prendida y algo cambió, reinicia los servicios para que
# lean los valores nuevos (ECS los lee al arrancar cada tarea).
param(
    [switch]$Meta,
    [switch]$RotarClaves
)
. "$PSScriptRoot\comun.ps1"
Verificar-Credenciales

$Pendiente = 'PENDIENTE-CONFIGURAR'
$Cambios = $false

# El valor viaja en un JSON temporal (--cli-input-json) y no como argumento: así ningún carácter
# especial del secreto se pierde al pasar de PowerShell a aws.exe, y no queda en la lista de procesos.
function Poner([string]$nombre, [string]$valor, [string]$tipo = 'SecureString') {
    $archivo = [System.IO.Path]::GetTempFileName()
    try {
        $json = @{ Name = "/$Proyecto/$nombre"; Value = $valor; Type = $tipo; Overwrite = $true } | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($archivo, $json, (New-Object System.Text.UTF8Encoding $false))
        Aws ssm put-parameter --cli-input-json "file://$archivo" | Out-Null
    } finally {
        Remove-Item $archivo -Force -ErrorAction SilentlyContinue
    }
    $script:Cambios = $true
}

function Leer-Parametro([string]$nombre) {
    return AwsIntentar ssm get-parameter --name "/$Proyecto/$nombre" --with-decryption --query Parameter.Value --output text
}

# Clave aleatoria (sin / " @ ni espacios: también sirve como contraseña de RDS).
function Nueva-Clave {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

# Pregunta un valor por consola. Los secretos se escriben ocultos.
function Preguntar([string]$texto, [bool]$secreto) {
    if (-not $secreto) { return (Read-Host "    $texto").Trim() }
    $seguro = Read-Host "    $texto" -AsSecureString
    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero)).Trim() }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero) }
}

# ---------------------------------------------------------------------------------------------
Paso 'Claves internas (se generan solas)'
# La contraseña de la base NUNCA se cambia aquí: los snapshots se restauran con la misma.
if (Existe-Parametro "/$Proyecto/bd/password") {
    Ok 'bd/password (ya existe: no se cambia)'
} else {
    Poner 'bd/password' (Nueva-Clave)
    Ok 'bd/password (generada)'
}
foreach ($nombre in 'jwt-secret', 'gateway-shared-secret', 'frontend-proxy-secret') {
    if ($RotarClaves) {
        Poner $nombre (Nueva-Clave)
        Ok "$nombre (nueva)"
    } elseif (Existe-Parametro "/$Proyecto/$nombre") {
        Ok "$nombre (ya existe)"
    } else {
        Poner $nombre (Nueva-Clave)
        Ok "$nombre (generada)"
    }
}

# ---------------------------------------------------------------------------------------------
Paso 'WhatsApp (Meta)'
# Nombre en SSM, texto de la pregunta, tipo y si se escribe oculto.
$DatosMeta = @(
    @{ Nombre = 'meta/access-token'; Texto = 'Token de acceso permanente (Business Settings > Usuarios del sistema)'; Tipo = 'SecureString'; Secreto = $true },
    @{ Nombre = 'meta/app-secret'; Texto = 'Clave secreta de la app (Configuración de la app > Básica)'; Tipo = 'SecureString'; Secreto = $true },
    @{ Nombre = 'meta/verify-token'; Texto = 'Token de verificación del webhook (el mismo que pones en Meta)'; Tipo = 'SecureString'; Secreto = $true },
    @{ Nombre = 'meta/phone-number-id'; Texto = 'Phone number ID (WhatsApp > API Setup)'; Tipo = 'String'; Secreto = $false },
    @{ Nombre = 'meta/waba-id'; Texto = 'WhatsApp Business Account ID (WhatsApp > API Setup)'; Tipo = 'String'; Secreto = $false }
)
$Preguntados = @($DatosMeta | Where-Object { $Meta -or -not (Existe-Parametro "/$Proyecto/$($_.Nombre)") })
if ($Preguntados.Count -eq 0) {
    Ok 'Datos de Meta ya cargados (para cambiarlos: .\infra\aws\configurar.ps1 -Meta)'
} else {
    Write-Host '    Escribe cada valor y presiona Enter. Vacío = dejar el que ya está (o dejarlo pendiente).'
    foreach ($dato in $Preguntados) {
        $valor = Preguntar $dato.Texto $dato.Secreto
        if ($valor) {
            Poner $dato.Nombre $valor $dato.Tipo
            Ok $dato.Nombre
        } elseif (Existe-Parametro "/$Proyecto/$($dato.Nombre)") {
            Ok "$($dato.Nombre) (sin cambios)"
        } else {
            # ECS no arranca una tarea si le falta un secreto: se guarda un valor provisional.
            Poner $dato.Nombre $Pendiente $dato.Tipo
            Aviso "$($dato.Nombre) queda pendiente"
        }
    }
}
foreach ($dato in $DatosMeta) {
    if ((Leer-Parametro $dato.Nombre) -eq $Pendiente) {
        Aviso "$($dato.Nombre) está PENDIENTE: WhatsApp no funcionará bien hasta completarlo (configurar.ps1 -Meta)"
    }
}

# ---------------------------------------------------------------------------------------------
if ($Cambios -and (Estado-Stack $StackApp) -ne 'NO_EXISTE') {
    Paso 'La app está prendida: reiniciando los servicios para que lean los valores nuevos'
    Reiniciar-Servicios
}
if ($RotarClaves) { Aviso 'Claves rotadas: todas las sesiones abiertas se cerraron (hay que volver a iniciar sesión).' }

Paso 'Listo'
