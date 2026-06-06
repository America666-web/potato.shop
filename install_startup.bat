@echo off
chcp 65001 >nul
cls
echo Устанавливаю автозапуск сервера KuzPotato...
set SRC=%~dp0start-server.bat
set DST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-server.bat
copy /Y "%SRC%" "%DST%" >nul
if %ERRORLEVEL% EQU 0 (
  echo Успешно. Скрипт будет запускаться при входе в Windows.
) else (
  echo Не удалось скопировать в папку автозапуска. Запустите этот файл с правами пользователя.
)
echo.
echo Для удаления автозапуска удалите файл:
echo %DST%
pause
