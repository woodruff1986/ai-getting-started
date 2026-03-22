#Requires -Version 5.1
<#
.SYNOPSIS
  Installe Desk Cursor depuis GitHub dans le dossier où se trouve ce script.

.PARAMETER Mode
  Release = télécharge le dernier .exe publié (GitHub Releases).
  Source  = clone le dépôt et exécute npm install (développement / build local).

.PARAMETER Repo
  Dépôt GitHub au format owner/nom (ex. woodruff1986/ai-getting-started).

.PARAMETER Branch
  Branche utilisée uniquement en mode Source.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Installer-Desk-Cursor.ps1
  powershell -ExecutionPolicy Bypass -File .\Installer-Desk-Cursor.ps1 -Mode Source
#>
param(
    [ValidateSet("Release", "Source")]
    [string]$Mode = "Release",

    [string]$Repo = "woodruff1986/ai-getting-started",

    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$InstallRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $InstallRoot

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

if ($Mode -eq "Release") {
    Write-Step "Recherche de la dernière release sur github.com/$Repo ..."
    try {
        $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "Desk-Cursor-Installer" }
    } catch {
        Write-Error "Impossible de contacter l'API GitHub : $_"
    }

    $exeAsset = $rel.assets | Where-Object { $_.name -match "\.exe$" } | Select-Object -First 1
    if (-not $exeAsset) {
        Write-Host ""
        Write-Host "Aucun fichier .exe trouvé dans la dernière release." -ForegroundColor Yellow
        Write-Host "Ouvre Actions sur GitHub, lance le workflow « Windows installer », puis réessaie." -ForegroundColor Yellow
        Write-Host "Ou utilise : -Mode Source pour cloner le code et construire localement (Windows + npm run dist:win)." -ForegroundColor Yellow
        exit 1
    }

    $outFile = Join-Path $InstallRoot $exeAsset.name
    Write-Step "Téléchargement de $($exeAsset.name) ($([math]::Round($exeAsset.size/1MB, 1)) Mo) ..."
    Invoke-WebRequest -Uri $exeAsset.browser_download_url -OutFile $outFile -Headers @{ "User-Agent" = "Desk-Cursor-Installer" }

    Write-Step "Lancement de l'installateur (suivre les étapes à l'écran) ..."
    Start-Process -FilePath $outFile -Wait
    Write-Host ""
    Write-Host "Terminé." -ForegroundColor Green
    exit 0
}

# --- Mode Source ---
$folderName = ($Repo -split "/")[-1]
$targetDir = Join-Path $InstallRoot $folderName

Write-Step "Installation depuis les sources dans : $targetDir"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git n'est pas installé ou pas dans le PATH. Installe Git : https://git-scm.com/download/win"
}

if (Test-Path $targetDir) {
    Write-Host "Dossier existant, mise à jour (git pull) ..."
    Push-Location $targetDir
    git pull origin $Branch
} else {
    Write-Host "Clone branche $Branch ..."
    git clone -b $Branch --depth 1 "https://github.com/$Repo.git" $targetDir
    Push-Location $targetDir
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js / npm introuvable. Installe Node LTS : https://nodejs.org"
}

Write-Step "npm install (peut prendre plusieurs minutes) ..."
npm install

Write-Host ""
Write-Host "Sources prêtes dans : $targetDir" -ForegroundColor Green
Write-Host "  · Lancer le site en dev :  npm run dev" -ForegroundColor Gray
Write-Host "  · Construire l'installeur : npm run dist:win  (sur cette machine Windows)" -ForegroundColor Gray
Pop-Location
