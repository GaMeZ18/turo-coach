@echo off
chcp 65001 >nul
title Detector de tiros - Coach Manager CBTuro
cd /d "%~dp0"
programa\python\python.exe programa\detector.py asistente "%~1"
echo.
pause
