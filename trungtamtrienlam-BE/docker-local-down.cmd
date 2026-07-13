@echo off
setlocal

cd /d "%~dp0"
if errorlevel 1 exit /b 1

docker compose down
if errorlevel 1 exit /b 1

echo Docker containers stopped. Database and media volumes were preserved.
echo Never add -v unless you intentionally want to delete local data.
