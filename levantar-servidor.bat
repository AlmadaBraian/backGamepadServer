@echo off
title Backend Arcade - Auto Setup & Launch
cd /d "%~dp0"

echo ============================================
echo 🚀 Iniciando Backend Arcade...
echo ============================================

REM Verificar si Node.js está instalado
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js no está instalado.
    echo 🔄 Descargando instalador de Node.js...
    
    powershell -Command "Invoke-WebRequest https://nodejs.org/dist/v18.20.2/node-v18.20.2-x64.msi -OutFile nodejs.msi"
    if exist nodejs.msi (
        echo ▶️ Ejecutando instalador...
        start /wait msiexec /i nodejs.msi /qn
        del nodejs.msi
        echo ✅ Node.js instalado.
    ) else (
        echo ❌ No se pudo descargar Node.js.
        pause
        exit /b
    )
) else (
    echo ✅ Node.js ya está instalado.
)

REM Verificar si ngrok está instalado
if not exist ".\ngrok.exe" (
    echo 🔄 Descargando ngrok...
    powershell -Command "Invoke-WebRequest https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-stable-windows-amd64.zip -OutFile ngrok.zip"
    powershell -Command "Expand-Archive -Path ngrok.zip -DestinationPath . -Force"
    del ngrok.zip
    echo ✅ Ngrok descargado.
)

REM Verificar token de ngrok
if not exist ".\ngrok_config.txt" (
    echo 🔐 No hay token de autenticación de ngrok configurado.
    echo 👉 Creá un archivo llamado ngrok_config.txt y pegá tu token de ngrok ahí.
    pause
    exit /b
)

set /p NGROK_TOKEN=<ngrok_config.txt
ngrok config add-authtoken %NGROK_TOKEN%

REM Iniciar ngrok
start "" ngrok http 4000 >nul

REM Esperar 3 segundos a que arranque ngrok
timeout /t 3 >nul

REM Obtener URL pública
for /f "delims=" %%a in ('curl -s http://127.0.0.1:4040/api/tunnels ^| findstr "public_url"') do set "NGROK_URL=%%a"
echo 🌐 URL pública: %NGROK_URL%

REM Iniciar servidor Node
echo ▶️ Iniciando servidor Node.js...
node server.js

echo 🔴 El servidor se detuvo.
pause
