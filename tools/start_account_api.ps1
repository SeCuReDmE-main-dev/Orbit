param([string]$PhpPath = (Join-Path $env:LOCALAPPDATA 'OrbitTools/php-8.4.26/php.exe'))
$ErrorActionPreference = 'Stop'
$orbitRoot = Split-Path $PSScriptRoot -Parent
$privateDir = Join-Path $orbitRoot '.orbit'
$apiRoot = Join-Path $orbitRoot 'services/account-api'
$certificate = Join-Path $privateDir 'cacert.pem'
$runtimeIni = Join-Path $privateDir 'php.ini'
if (!(Test-Path -LiteralPath $PhpPath)) { throw 'Set -PhpPath to the installed PHP 8.3+ executable.' }
New-Item -ItemType Directory -Force -Path $privateDir | Out-Null
if (!(Test-Path -LiteralPath $certificate)) {
    Invoke-WebRequest 'https://curl.se/ca/cacert.pem' -OutFile $certificate
    $response = Invoke-WebRequest 'https://curl.se/ca/cacert.pem.sha256'
    $hashText = if ($response.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($response.Content) } else { [string]$response.Content }
    $expectedHash = ($hashText -split '\s+')[0]
    if ((Get-FileHash -LiteralPath $certificate -Algorithm SHA256).Hash -ine $expectedHash) {
        Remove-Item -LiteralPath $certificate
        throw 'The downloaded CA bundle failed its checksum check.'
    }
}
$baseIni = Join-Path (Split-Path $PhpPath -Parent) 'php.ini'
$settings = [IO.File]::ReadAllText($baseIni)
$settings = [regex]::Replace($settings, '(?m)^\s*;?\s*(curl.cainfo|openssl.cafile)\s*=.*$', '')
$settings += "`r`ncurl.cainfo=`"$certificate`"`r`nopenssl.cafile=`"$certificate`"`r`n"
[IO.File]::WriteAllText($runtimeIni, $settings)
$router = Join-Path $apiRoot 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
Write-Output 'Orbit account API: http://127.0.0.1:8788 — private logs in .orbit/account-api-local.log'
# Keep OAuth callback query strings out of terminal transcripts.
Push-Location (Join-Path $apiRoot 'public')
try {
    & $PhpPath -c $runtimeIni -S '127.0.0.1:8788' -t (Join-Path $apiRoot 'public') $router *> (Join-Path $privateDir 'account-api-local.log')
} finally {
    Pop-Location
}
