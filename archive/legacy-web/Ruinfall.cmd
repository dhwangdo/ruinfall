@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-desktop.ps1"
if errorlevel 1 pause
