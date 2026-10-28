@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~1"=="" (
  echo Arrastra el archivo del video del partido encima de este archivo.
  pause
  exit /b 1
)
programa\detector.exe calibrar "%~1"
pause
