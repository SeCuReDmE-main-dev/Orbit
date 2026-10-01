param(
    [string]$ReleaseId = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot 'services\account-api'
$releaseRoot = Join-Path $projectRoot '.orbit\releases'
$stage = Join-Path $releaseRoot "orbit-account-api-$ReleaseId"
$archive = "$stage.zip"

foreach ($requiredPath in @(
    (Join-Path $sourceRoot 'app'),
    (Join-Path $sourceRoot 'bootstrap\app.php'),
    (Join-Path $sourceRoot 'config'),
    (Join-Path $sourceRoot 'routes\web.php'),
    (Join-Path $sourceRoot 'vendor\autoload.php'),
    (Join-Path $sourceRoot 'composer.lock')
)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Expected account API file is missing: $requiredPath"
    }
}

if (Test-Path -LiteralPath $stage) {
    throw "Release directory already exists: $stage"
}

New-Item -ItemType Directory -Path $stage -Force | Out-Null

foreach ($directory in @('app', 'bootstrap', 'config', 'resources', 'routes', 'vendor')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $directory) -Destination (Join-Path $stage $directory) -Recurse -Force
}

foreach ($file in @('artisan', 'composer.json', 'composer.lock')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination (Join-Path $stage $file) -Force
}

# Runtime state is created fresh. Local accounts, sessions, logs, cached views,
# test fixtures and .env values are deliberately absent from the release.
foreach ($directory in @(
    'database',
    'storage\app\private',
    'storage\app\public',
    'storage\framework\cache\data',
    'storage\framework\sessions',
    'storage\framework\views',
    'storage\logs'
)) {
    New-Item -ItemType Directory -Path (Join-Path $stage $directory) -Force | Out-Null
}
New-Item -ItemType File -Path (Join-Path $stage 'database\database.sqlite') -Force | Out-Null

$manifest = [ordered]@{
    releaseId = "orbit-account-api-$ReleaseId"
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    routes = @('/api/v1/knowledge/outline', '/api/v1/knowledge/entries')
    environmentBundled = $false
    localDataBundled = $false
    testsBundled = $false
} | ConvertTo-Json -Depth 4
Set-Content -LiteralPath (Join-Path $stage 'orbit-api-release.json') -Value $manifest -Encoding utf8

if (Get-ChildItem -LiteralPath $stage -Force -Recurse -File | Where-Object { $_.Name -eq '.env' }) {
    throw 'Refusing to package an environment file.'
}

$forbiddenPatterns = @(
    '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'SANITY_CONTEXT_VIEWER_TOKEN\s*=',
    'EMAIL_ORBIT_PASSWORD\s*='
)
foreach ($pattern in $forbiddenPatterns) {
    $hits = rg -l --hidden $pattern $stage
    if ($LASTEXITCODE -eq 0 -and $hits) {
        throw "Refusing to package a secret marker: $pattern"
    }
}

$hashLines = Get-ChildItem -LiteralPath $stage -Recurse -File |
    Sort-Object FullName |
    ForEach-Object {
        $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $relative = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
        "$hash  $relative"
    }
Set-Content -LiteralPath (Join-Path $stage 'SHA256SUMS.txt') -Value $hashLines -Encoding utf8

if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stage,
    $archive,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

[pscustomobject]@{
    stage = $stage
    archive = $archive
    archiveSha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    environmentBundled = $false
    localDataBundled = $false
    secretScan = 'passed'
} | ConvertTo-Json -Depth 3
