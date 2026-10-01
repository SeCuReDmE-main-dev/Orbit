param(
    [string]$ReleaseId = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$webDist = Join-Path $projectRoot 'web\dist'
$studioDist = Join-Path $projectRoot 'studio\dist'
$releaseRoot = Join-Path $projectRoot '.orbit\releases'
$stage = Join-Path $releaseRoot "orbit-public-$ReleaseId"
$archive = "$stage.zip"

foreach ($requiredPath in @($webDist, $studioDist, (Join-Path $studioDist 'index.html'), (Join-Path $studioDist 'static'))) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Expected build output is missing: $requiredPath. Build @orbit/web and @orbit/studio before packaging."
    }
}

if (Test-Path -LiteralPath $stage) {
    throw "Release directory already exists: $stage"
}

New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -Path (Join-Path $webDist '*') -Destination $stage -Recurse -Force

$studioDestination = Join-Path $stage 'studio'
New-Item -ItemType Directory -Path $studioDestination -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $studioDist 'index.html') -Destination (Join-Path $studioDestination 'index.html') -Force

# Sanity's build currently emits absolute /static URLs. Mount its static assets
# at the public root so /studio/ can be deployed without rewriting asset URLs.
if (Test-Path -LiteralPath (Join-Path $stage 'static')) {
    throw 'The Astro build already owns /static; refusing to nest Studio assets under an ambiguous path.'
}
Copy-Item -LiteralPath (Join-Path $studioDist 'static') -Destination (Join-Path $stage 'static') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'web\public\.htaccess') -Destination (Join-Path $stage '.htaccess') -Force

$expectedFiles = @(
    'index.html',
    'app\index.html',
    'api\index.php',
    'api\.htaccess',
    'guide\index.html',
    'benchmark\index.html',
    'benchmark\suite-a-development.json',
    'studio\index.html',
    '.htaccess'
)
foreach ($relativePath in $expectedFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $stage $relativePath))) {
        throw "Required public route artifact is missing: $relativePath"
    }
}

$secretMarkers = 'SANITY_API_TOKEN\s*=', 'OPENAI_API_KEY\s*=', 'CPANEL_SSH_PASSWORD\s*=', 'EMAIL_ORBIT_PASSWORD\s*='
foreach ($marker in $secretMarkers) {
    $secretHits = rg -l --hidden --glob '!SHA256SUMS.txt' $marker $stage
    if ($LASTEXITCODE -eq 0 -and $secretHits) {
        throw "Refusing to package a secret marker: $marker"
    }
}

$manifest = [ordered]@{
    releaseId = "orbit-public-$ReleaseId"
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    publicRoutes = @('/', '/app/', '/guide/', '/benchmark/', '/studio/')
    contextGateway = [ordered]@{
        path = '/api/v1/knowledge/*'
        frontControllerBundled = $true
        backendBundled = $false
        note = 'The public front controller is present. The private Laravel application and its Sanity credential are deployed separately outside the document root.'
    }
    secrets = $false
} | ConvertTo-Json -Depth 5
Set-Content -LiteralPath (Join-Path $stage 'orbit-release.json') -Value $manifest -Encoding utf8

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
$archiveHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()

[pscustomobject]@{
    stage = $stage
    archive = $archive
    archiveSha256 = $archiveHash
    routes = @('/', '/app/', '/guide/', '/benchmark/', '/studio/')
    secretScan = 'passed'
} | ConvertTo-Json -Depth 3
