$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
chcp 65001 | Out-Null

$root = "F:\Projects\lekala-site"
$preferredPython = "C:\ProgramData\miniconda3\python.exe"
$python = if (Test-Path $preferredPython) { $preferredPython } else { "python" }
$apiLog = Join-Path $root "vse-api.out.log"
$apiErr = Join-Path $root "vse-api.err.log"
$uiLog = Join-Path $root "vse-ui.out.log"
$uiErr = Join-Path $root "vse-ui.err.log"

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

function Stop-Port {
  param([int]$Port)
  $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  foreach ($conn in $connections) {
    try {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Output "Stopped process on port ${Port}: $($conn.OwningProcess)"
    } catch {}
  }
}

function Test-Url {
  param(
    [string]$Url,
    [int]$TimeoutSec = 3
  )
  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-Url {
  param(
    [string]$Url,
    [string]$Name,
    [int]$Attempts = 30
  )
  for ($i = 1; $i -le $Attempts; $i++) {
    if (Test-Url $Url 4) {
      Write-Output "$Name OK: $Url"
      return $true
    }
    Start-Sleep -Seconds 1
  }
  Write-Output "$Name check failed: $Url"
  return $false
}

function Start-Api {
  Start-Process `
    -FilePath $python `
    -ArgumentList 'tools/vse/api_server.py' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $apiLog `
    -RedirectStandardError $apiErr `
    -PassThru
}

function Start-Ui {
  Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList 'run','dev' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $uiLog `
    -RedirectStandardError $uiErr `
    -PassThru
}

function Show-Last-LogLines {
  param(
    [string]$Path,
    [int]$Tail = 20
  )
  if (Test-Path $Path) {
    Write-Output "--- $Path ---"
    Get-Content -Path $Path -Tail $Tail -ErrorAction SilentlyContinue
  }
}

Set-Location $root

Stop-Port 5175
Stop-Port 7070

$api = Start-Api
Write-Output "Started VSE API on 7070, pid=$($api.Id)"

$ui = Start-Ui
Write-Output "Started VSE UI dev server on 5175, pid=$($ui.Id)"

$apiReady = Wait-Url 'http://127.0.0.1:7070/api/node-state/ac00001' 'API'
$uiReady = Wait-Url 'http://127.0.0.1:5175/tools/vse' 'UI'

Write-Output ""
Write-Output "Open: http://127.0.0.1:5175/tools/vse"
$lanAddresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -notlike "172.28.*" -and
    $_.IPAddress -notlike "10.36.*"
  } |
  Select-Object -ExpandProperty IPAddress)
foreach ($address in $lanAddresses) {
  Write-Output "LAN:  http://${address}:5175/tools/vse"
}
Write-Output "Logs: $apiLog | $uiLog"
Write-Output "This task is intentionally long-running. Stop it with Ctrl+C."
Write-Output ""

if (-not $apiReady -or -not $uiReady) {
  Show-Last-LogLines $apiErr
  Show-Last-LogLines $uiErr
  Show-Last-LogLines $uiLog
}

try {
  while ($true) {
    Start-Sleep -Seconds 5

    $apiAlive = $api -and -not $api.HasExited
    $uiAlive = $ui -and -not $ui.HasExited

    if (-not $apiAlive) {
      Write-Output "API process stopped. Restarting..."
      Stop-Port 7070
      $api = Start-Api
      Wait-Url 'http://127.0.0.1:7070/api/node-state/ac00001' 'API' 20 | Out-Null
    }

    if (-not $uiAlive -or -not (Test-Url 'http://127.0.0.1:5175/tools/vse' 3)) {
      Write-Output "UI process stopped or stopped answering. Restarting..."
      Stop-Port 5175
      $ui = Start-Ui
      Wait-Url 'http://127.0.0.1:5175/tools/vse' 'UI' 30 | Out-Null
    }
  }
} finally {
  Write-Output "Stopping VSE dev services..."
  if ($ui -and -not $ui.HasExited) { Stop-Process -Id $ui.Id -Force -ErrorAction SilentlyContinue }
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue }
  Stop-Port 5175
  Stop-Port 7070
}
