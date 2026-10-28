@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%~2"=="" (
  echo Uso: 3-evaluar.bat PARTIDO.detecciones.json ETIQUETAS.json
  echo  (las etiquetas se descargan en Coach Manager: Video, Exportar etiquetas)
  pause
  exit /b 1
)
.venv\Scripts\python detector.py evaluar "%~1" "%~2"
pause
