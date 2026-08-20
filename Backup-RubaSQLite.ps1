[CmdletBinding()]
param(
    [string]$BackupRoot = "$env:USERPROFILE\Documents\Ruba\SQLite_Backups",
    [int]$RetentionDays = 90,
    [bool]$RestartRuba = $false
)

$ErrorActionPreference = 'Stop'
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupFolder = Join-Path $BackupRoot $timestamp

function Find-RubaDatabase {
    $roots = @(
        $env:APPDATA,
        $env:LOCALAPPDATA,
        "$env:USERPROFILE\AppData\Roaming",
        "$env:USERPROFILE\AppData\Local"
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($root in $roots) {
        $match = Get-ChildItem -Path $root -Filter 'ruba.sqlite' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) { return $match.FullName }
    }
    return $null
}

$dbPath = Find-RubaDatabase
if (-not $dbPath) {
    throw 'Base ruba.sqlite introuvable dans APPDATA ou LOCALAPPDATA. Ouvrez Ruba et sauvegardez au moins un projet avant la première sauvegarde.'
}

$rubaProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -match 'Ruba|react-example'
}
$wasRunning = $rubaProcesses.Count -gt 0
if ($wasRunning) {
    if ($RestartRuba) {
        $rubaProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    } else {
        throw 'Ruba est ouvert. Fermez Ruba avant la sauvegarde, ou relancez le script avec -RestartRuba $true.'
    }
}

New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
Copy-Item -LiteralPath $dbPath -Destination (Join-Path $backupFolder 'ruba.sqlite') -Force

# SQLite peut maintenir ces fichiers associés en mode WAL. Ils sont copiés
# lorsqu’ils existent et proviennent du même instant de sauvegarde.
foreach ($suffix in @('-wal', '-shm')) {
    $sidecar = "$dbPath$suffix"
    if (Test-Path $sidecar) {
        Copy-Item -LiteralPath $sidecar -Destination (Join-Path $backupFolder "ruba.sqlite$suffix") -Force
    }
}

$manifest = [ordered]@{
    createdAt = (Get-Date).ToString('o')
    sourceDatabase = $dbPath
    backupFolder = $backupFolder
    host = $env:COMPUTERNAME
    user = $env:USERNAME
}
$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $backupFolder 'backup-manifest.json') -Encoding UTF8

Get-ChildItem -Path $BackupRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Recurse -Force

if ($wasRunning -and $RestartRuba) {
    $exeCandidates = @(
        "$env:LOCALAPPDATA\Programs\Ruba Packing List\Ruba Packing List.exe",
        "$env:PROGRAMFILES\Ruba Packing List\Ruba Packing List.exe",
        "$env:USERPROFILE\Desktop\Ruba Packing List.exe"
    )
    $exe = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($exe) { Start-Process -FilePath $exe }
}

Write-Host "Sauvegarde Ruba créée : $backupFolder"
