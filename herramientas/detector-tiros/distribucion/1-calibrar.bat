@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~1"=="" (
  echo Arrastra el archivo del video del partido encima de este archivo.
  pause
  exit /b 1
)
echo Buscando las canastas... (pulsa M en la ventana para marcarlas a mano)
programa\python\python.exe programa\detector.py calibrar "%~1"
pause
