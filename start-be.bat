@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "BE_DIR=%ROOT%trungtamtrienlam-BE"
set "APP_PORT_VALUE=8003"
set "DO_BUILD=0"
set "NO_PAUSE=0"

if defined APP_PORT set "APP_PORT_VALUE=%APP_PORT%"
set "APP_URL=http://127.0.0.1:%APP_PORT_VALUE%"

:parse_args
if "%~1"=="" goto :args_done
if /I "%~1"=="--build" (
  set "DO_BUILD=1"
  shift
  goto :parse_args
)
if /I "%~1"=="--no-pause" (
  set "NO_PAUSE=1"
  shift
  goto :parse_args
)

echo [ERROR] Unknown option: %~1
echo Usage: start-be.bat [--build] [--no-pause]
goto :fail_before_start

:args_done
if not exist "%BE_DIR%\docker-compose.yml" (
  echo [ERROR] Missing Docker Compose file:
  echo         %BE_DIR%\docker-compose.yml
  goto :fail_before_start
)

if not exist "%BE_DIR%\.env.local" (
  echo [ERROR] Missing backend environment file:
  echo         %BE_DIR%\.env.local
  goto :fail_before_start
)

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker was not found. Install or start Docker Desktop first.
  goto :fail_before_start
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Compose v2 is not available.
  goto :fail_before_start
)

docker version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Engine is not running. Start Docker Desktop first.
  goto :fail_before_start
)

cd /d "%BE_DIR%"
if errorlevel 1 (
  echo [ERROR] Cannot enter backend folder: %BE_DIR%
  goto :fail_before_start
)

echo [INFO] Backend: %BE_DIR%
echo [INFO] API port: %APP_PORT_VALUE%
echo [SAFE] This script does not restore backups or remove Docker volumes.

if "%DO_BUILD%"=="1" (
  echo [INFO] Building backend images...
  docker compose build
  if errorlevel 1 goto :fail
)

echo [INFO] Starting PostgreSQL and Redis...
docker compose up -d --wait postgres redis
if errorlevel 1 goto :fail

echo [INFO] Applying database migrations...
docker compose run --rm --no-deps app poetry run python manage.py migrate --noinput
if errorlevel 1 goto :fail

echo [INFO] Starting API, Celery worker and Celery beat...
docker compose up -d --wait
if errorlevel 1 goto :fail

echo [INFO] Waiting for backend readiness (up to 60 seconds)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(60); $lastError = 'not ready'; do { try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%/readiness/' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host $response.Content; exit 0 } } catch { $lastError = $_.Exception.Message }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); Write-Error ('Backend readiness timed out: ' + $lastError); exit 1"
if errorlevel 1 goto :fail

echo.
docker compose ps
echo.
echo [OK] Backend is ready: %APP_URL%
echo [OK] Readiness check: %APP_URL%/readiness/
echo [INFO] Use --build on the first run or after backend dependency/code changes.
goto :success

:fail
echo.
echo [ERROR] Backend startup failed. Current container status:
docker compose ps
echo [INFO] Review logs with:
echo        cd /d "%BE_DIR%"
echo        docker compose logs --tail=200 app postgres redis celery_worker celery_beat
goto :finish_error

:fail_before_start
echo [INFO] Usage: start-be.bat [--build] [--no-pause]
goto :finish_error

:success
if "%NO_PAUSE%"=="0" pause
exit /b 0

:finish_error
if "%NO_PAUSE%"=="0" pause
exit /b 1
