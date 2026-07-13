@echo off
setlocal

cd /d "%~dp0"
if errorlevel 1 goto :error

echo [1/3] Validating Docker Compose configuration...
docker compose config --quiet
if errorlevel 1 goto :error

echo [2/3] Building and starting the local backend stack...
docker compose up -d --build --wait --wait-timeout 180
if errorlevel 1 goto :error

echo [3/3] Checking the Django liveness endpoint...
curl.exe --fail --silent http://127.0.0.1:8000/healthcheck/
if errorlevel 1 goto :error
echo.

docker compose ps
echo.
echo Backend is ready at http://127.0.0.1:8000
echo Stop safely with: docker-local-down.cmd
exit /b 0

:error
echo.
echo [ERROR] Docker local startup failed. Inspect with:
echo docker compose logs --tail=150 web postgres redis celery_worker celery_beat
exit /b 1
