@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Installation Desk Cursor depuis GitHub...
echo Dossier d'installation : %~dp0
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installer-Desk-Cursor.ps1" %*
if errorlevel 1 pause
