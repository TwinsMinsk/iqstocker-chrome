<#
  Package Chrome Extension into ZIP and publish it into frontend/public (for website download).

  What it does:
  - (optional) updates version in `extension/src/manifest.json`
  - builds extension into `extension/dist` via `npm run build`
  - creates ZIP `frontend/public/downloads/extension/latest.zip`
  - writes metadata `frontend/public/downloads/extension/latest.json`

  Usage:
    powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1 -Version 1.0.2

  Requirements:
  - Node.js + npm installed
  - `extension/package-lock.json` present (for `npm ci`)
#>

[CmdletBinding()]
param(
  # If provided, will be written into `extension/src/manifest.json` as "version"
  [Parameter(Mandatory = $false)]
  [string]$Version,

  # Where to publish artifacts (defaults to frontend public folder)
  [Parameter(Mandatory = $false)]
  [string]$OutDir
)

$ErrorActionPreference = "Stop"

# Определяем путь к скрипту, если $PSScriptRoot пустой
if (-not $PSScriptRoot) {
    $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not $PSScriptRoot) {
        $PSScriptRoot = Split-Path -Parent (Get-Location).Path
    }
}

# Устанавливаем OutDir по умолчанию, если не указан
if (-not $OutDir) {
    $OutDir = (Join-Path $PSScriptRoot "..\frontend\public\downloads\extension")
}

function Assert-FileExists([string]$PathToFile, [string]$Hint) {
  if (-not (Test-Path -LiteralPath $PathToFile)) {
    throw "File not found: $PathToFile. $Hint"
  }
}

function Run-Checked([string]$Command, [string[]]$Arguments, [string]$WorkingDirectory) {
  # Using call operator (&) is the most reliable way to run .cmd (npm.cmd) on Windows.
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ExtensionDir = Join-Path $RepoRoot "extension"

$ManifestSrcPath = Join-Path $ExtensionDir "src\manifest.json"
Assert-FileExists $ManifestSrcPath "Check repository structure."

# 1) (Optional) bump version in manifest.json
# ВАЖНО: Читаем и записываем файл с явной UTF-8 кодировкой (без BOM) для сохранения русского текста
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$manifestJson = [System.IO.File]::ReadAllText($ManifestSrcPath, $utf8NoBom)
$manifest = $manifestJson | ConvertFrom-Json

if ($Version) {
  # Minimal semver check (x.y.z). Extend if needed.
  if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Version must be x.y.z (example: 1.0.2). Got: $Version"
  }
  $manifest.version = $Version
  # Сохраняем с правильной кодировкой UTF-8 без BOM
  $updatedJson = $manifest | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText($ManifestSrcPath, $updatedJson, $utf8NoBom)
}

$FinalVersion = [string]$manifest.version
if (-not $FinalVersion) {
  throw "Failed to read version from $ManifestSrcPath"
}

Write-Host "Extension version: $FinalVersion"

# 2) Install deps + build extension (dist/)
Assert-FileExists (Join-Path $ExtensionDir "package.json") "extension/ must be a Node project."

if (Test-Path -LiteralPath (Join-Path $ExtensionDir "package-lock.json")) {
  Write-Host "npm ci (extension)..."
  Run-Checked "npm" @("ci", "--silent") $ExtensionDir
} else {
  Write-Host "npm install (extension)..."
  Run-Checked "npm" @("install", "--silent") $ExtensionDir
}

Write-Host "npm run build (extension)..."
Run-Checked "npm" @("run", "build", "--silent") $ExtensionDir

$DistDir = Join-Path $ExtensionDir "dist"
Assert-FileExists (Join-Path $DistDir "manifest.json") "After build, dist/manifest.json must exist."

# 3) Publish: ZIP + latest.json
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$ZipPath = Join-Path $OutDir "latest.zip"
if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Write-Host "Creating ZIP and updating latest.json..."
# Используем Node.js скрипты для создания ZIP и обновления JSON (избегаем проблем с кодировкой PowerShell)
$createZipScript = Join-Path $PSScriptRoot "create-zip.js"
$updateJsonScript = Join-Path $PSScriptRoot "update-latest-json.js"

if (Test-Path $createZipScript) {
  node $createZipScript
  if (-not (Test-Path $ZipPath)) {
    throw "Failed to create ZIP file at $ZipPath"
  }
  # Обновляем latest.json
  if (Test-Path $updateJsonScript) {
    node $updateJsonScript
  }
} else {
  # Fallback на PowerShell если скрипты не найдены
  Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $ZipPath -Force
  $zipInfo = Get-Item -LiteralPath $ZipPath
  $hash = Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256
  $LatestJsonPath = Join-Path $OutDir "latest.json"
  $latest = [ordered]@{
    version    = $FinalVersion
    built_at   = (Get-Date).ToUniversalTime().ToString("o")
    sha256     = $hash.Hash.ToLowerInvariant()
    size_bytes = [int64]$zipInfo.Length
  }
  $latest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $LatestJsonPath -Encoding UTF8
}

Write-Host "Done:"
Write-Host "  ZIP: $ZipPath"
Write-Host "  META: $LatestJsonPath"


