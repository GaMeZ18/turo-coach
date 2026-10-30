@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~1"=="" (
  echo Arrastra el archivo del video del partido encima de este archivo.
  pause
  exit /b 1
)
programa\python\python.exe programa\detector.py analizar "%~1" --depurar
echo.
echo Listo. Sube el archivo .detecciones.json que hay junto al video en Coach Manager: Video, Detecciones, Importar.
pause
