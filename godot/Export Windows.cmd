@echo off
setlocal
set "GODOT_EXE=%~dp0..\work\godot-tools\4.7.2\Godot_v4.7.2-stable_win64.exe"

if not exist "%GODOT_EXE%" (
    where godot.exe >nul 2>nul
    if errorlevel 1 (
        echo Godot 4.7+ was not found. Install Godot or place the bundled executable in work\godot-tools\4.7.2.
        pause
        exit /b 1
    )
    set "GODOT_EXE=godot.exe"
)

call :find_templates
if defined MISSING_TEMPLATES (
    where godot.exe >nul 2>nul
    if not errorlevel 1 (
        set "GODOT_EXE=godot.exe"
        call :find_templates
    )
)
if defined MISSING_TEMPLATES (
    echo Godot %TEMPLATE_VERSION% Windows export templates are missing.
    echo Open this same Godot version, choose Editor ^> Manage Export Templates, and install them.
    echo Then run this file again.
    pause
    exit /b 1
)

if not exist "%~dp0build" mkdir "%~dp0build"
"%GODOT_EXE%" --headless --path "%~dp0." --script res://scripts/generate_build_info.gd
if errorlevel 1 (
    echo Could not generate commit version information.
    pause
    exit /b 1
)
"%GODOT_EXE%" --headless --path "%~dp0." --export-release "Windows Desktop" "%~dp0build\RUINFALL.exe"
if errorlevel 1 (
    echo Export failed. Confirm that Godot %TEMPLATE_VERSION% export templates are installed.
    pause
    exit /b 1
)

echo Exported: %~dp0build\RUINFALL.exe
pause
exit /b 0

:find_templates
for /f "delims=" %%V in ('"%GODOT_EXE%" --version') do set "TEMPLATE_VERSION=%%V"
set "TEMPLATE_DIR=%APPDATA%\Godot\export_templates\%TEMPLATE_VERSION%"
if exist "%~dp0..\work\godot-tools\4.7.2\._sc_" (
    set "TEMPLATE_DIR=%~dp0..\work\godot-tools\4.7.2\editor_data\export_templates\%TEMPLATE_VERSION%"
)
set "MISSING_TEMPLATES=1"
if exist "%TEMPLATE_DIR%\windows_release_x86_64.exe" if exist "%TEMPLATE_DIR%\windows_debug_x86_64.exe" set "MISSING_TEMPLATES="
exit /b 0
