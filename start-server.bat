@echo off
chcp 65001 >nul
title KuzPotato Server
color 0A
cls

echo =========================================
echo     KuzPotato Authentication Server
echo =========================================
echo.
echo Запускаем сервер на http://localhost:3000
echo.
echo Для остановки нажмите Ctrl+C
echo.
echo =========================================
echo.

cd /d "%~dp0"
"C:/Users/sandr/AppData/Local/Programs/Python/Python314/python.exe" server.py

pause
