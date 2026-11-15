@echo off
setlocal
for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"
set "BUILT_GAME=%PROJECT_DIR%\build\RUINFALL.exe"
set "GODOT_EXE=%PROJECT_DIR%\..\work\godot-tools\4.7.2\Godot_v4.7.2-stable_win64.exe"
set "LOG_FILE=%TEMP%\RUINFALL-Godot.log"

if exist "%GODOT_EXE%" (
    start "" /D "%PROJECT_DIR%" "%GODOT_EXE%" --path "%PROJECT_DIR%" --log-file "%LOG_FILE%"
    exit /b 0
)

where godot.exe >nul 2>nul
if not errorlevel 1 (
    start "" /D "%PROJECT_DIR%" godot.exe --path "%PROJECT_DIR%" --log-file "%LOG_FILE%"
    exit /b 0
)

if exist "%BUILT_GAME%" (
    start "" /D "%PROJECT_DIR%" "%BUILT_GAME%" --log-file "%LOG_FILE%"
    exit /b 0
)

echo Godot 4.7 or newer was not found.
echo Install Godot to run the project source, or export build\RUINFALL.exe on a development computer first.
pause
