@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Detector de tiros: instalacion ===
where py >nul 2>nul
if errorlevel 1 (
  echo No encuentro Python. Instala Python 3.12 desde https://www.python.org/downloads/ marcando "Add python.exe to PATH" y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
if not exist .venv (
  py -3 -m venv .venv
)
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Ha fallado la instalacion. Revisa la conexion a internet y vuelve a probar.
  pause
  exit /b 1
)
echo.
echo Instalado. Ahora arrastra el video del partido sobre 1-calibrar.bat
pause
