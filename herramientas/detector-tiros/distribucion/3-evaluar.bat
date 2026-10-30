@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~2"=="" (
  echo Uso: arrastra a la vez el archivo .detecciones.json y el de etiquetas encima de este archivo.
  echo  (las etiquetas se descargan en Coach Manager: Video, Detecciones, Descargar etiquetas)
  pause
  exit /b 1
)
set "DET=%~1"
set "ETI=%~2"
echo %~nx2 | find /i ".detecciones." >nul && (set "DET=%~2" & set "ETI=%~1")
programa\python\python.exe programa\detector.py evaluar "%DET%" "%ETI%"
pause
