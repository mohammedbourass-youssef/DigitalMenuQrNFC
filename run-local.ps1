<#
.SYNOPSIS
  Runs the Smart Menu NFC stack locally (Windows + Docker Desktop).

.DESCRIPTION
  Loads docker-compose.yaml together with docker-compose.local.yaml, the local
  override that:
    * swaps the production nginx config (which needs Cloudflare TLS certs that
      only exist on the server) for nginx/conf.d/app.local.conf,
    * opens the gateway on plain HTTP (port 80 only, no 443),
    * runs the backend in Development mode so Swagger is available.

  The deployment files (docker-compose.yaml, nginx/conf.d/app.conf, deploy.sh,
  .github/workflows/deploy.yml) are never modified and never read by the
  deployment pipeline for this local setup.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\run-local.ps1

  .\run-local.ps1 -Status    # show container status
  .\run-local.ps1 -Logs      # tail the container logs
  .\run-local.ps1 -Migrate   # apply pending database migrations only
  .\run-local.ps1 -Down      # stop the local stack
#>
[CmdletBinding()]
param(
    [switch]$Down,
    [switch]$Logs,
    [switch]$Status,
    [switch]$Migrate
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$ComposeFiles = @('-f', 'docker-compose.yaml', '-f', 'docker-compose.local.yaml')

function Write-Step([string]$Message) {
    Write-Host "[local] $Message" -ForegroundColor Cyan
}

function Stop-WithError([string]$Message) {
    Write-Host "[local] ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Invoke-Compose([string[]]$Arguments) {
    docker compose @ComposeFiles @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError "docker compose $($Arguments -join ' ') failed (exit code $LASTEXITCODE)."
    }
}

function Test-Port([int]$Port) {
    $client = $null
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $task = $client.ConnectAsync('127.0.0.1', $Port)
        if (-not $task.Wait(1000)) { return $false }
        return $client.Connected
    }
    catch { return $false }
    finally { if ($null -ne $client) { $client.Dispose() } }
}

function Wait-ForPort([int]$Port, [string]$Name, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port $Port) { return }
        Start-Sleep -Seconds 2
    }
    Stop-WithError "$Name did not come up on port $Port within $TimeoutSeconds seconds. Check the logs with: .\run-local.ps1 -Logs"
}

# ---- prerequisites -----------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Stop-WithError "docker was not found on PATH. Install Docker Desktop first."
}
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Stop-WithError "the Docker daemon is not running. Start Docker Desktop and retry."
}

# ---- one-shot commands -------------------------------------------------------
if ($Status) { Invoke-Compose @('ps'); exit 0 }
if ($Logs) { Invoke-Compose @('logs', '-f', '--tail', '200'); exit 0 }
if ($Down) { Invoke-Compose @('down'); exit 0 }

Write-Step "configuration: docker-compose.yaml + docker-compose.local.yaml"

if (-not $Migrate) {
    Write-Step "building images and starting the stack (the first run takes a few minutes)..."
    Invoke-Compose @('up', '-d', '--build')
}

Write-Step "applying database migrations..."
Invoke-Compose @('run', '--rm', 'backend', 'dotnet', 'NFC_Backend.dll', '--migrate-only')

if (-not $Migrate) {
    Write-Step "restarting the backend..."
    Invoke-Compose @('restart', 'backend')
    Write-Step "waiting for the API (port 7194) and the gateway (port 80)..."
    Wait-ForPort -Port 7194 -Name 'the backend' -TimeoutSeconds 90
    Wait-ForPort -Port 80 -Name 'the gateway' -TimeoutSeconds 60
    Write-Step "the stack is up."
}

Write-Host ''
Write-Step 'Local endpoints:'
Write-Host @"
  Admin dashboard : http://localhost/
  Customer menu   : http://snackme.localhost/   (any http://<slug>.localhost/)
  API             : http://localhost/api/
  Swagger         : http://localhost:7194/swagger
  Seq (logs)      : http://localhost/seq/
  pgAdmin         : http://localhost/pgadmin/   (direct: http://localhost:5050/)
  MinIO console   : http://localhost/minio/     (direct: http://localhost:9001/)
"@

Write-Step 'Optional hot-reload frontends, each in its own terminal:'
Write-Host @"
  cd "Admin FrontEnd/Snack-X-Menu-Admin"
  npm ci
  npm run dev                                  -> http://localhost:5173

  cd "Admin FrontEnd/Menu"
  npm ci
  npm run dev -- --config vite.config.local.ts -> http://localhost:5174
"@

Write-Step 'First run: register a restaurant in the admin dashboard. Its menu is served at'
Write-Host '          http://<slugified-name>.localhost/ ("SnackMe" -> http://snackme.localhost/).'
