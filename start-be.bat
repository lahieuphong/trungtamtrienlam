@echo off
setlocal

set "ROOT=%~dp0"
set "BE_DIR=%ROOT%trungtamtrienlam-BE"

cd /d "%BE_DIR%"
if errorlevel 1 (
  echo [ERROR] Cannot enter backend folder: %BE_DIR%
  pause
  exit /b 1
)

if not exist ".\venv\Scripts\activate.bat" (
  echo [ERROR] Missing backend virtual environment: %BE_DIR%\venv
  echo Create it first with: python -m venv venv
  pause
  exit /b 1
)

call ".\venv\Scripts\activate.bat"
set "DJANGO_SETTINGS_MODULE=config.settings.development"

python -c "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('uvicorn') else 1)" >nul 2>nul
if errorlevel 1 (
  echo [INFO] uvicorn is missing in venv. Installing backend dependencies...
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
  )
)

echo [INFO] Applying database migrations...
python manage.py migrate
if errorlevel 1 (
  echo [ERROR] Database migration failed.
  pause
  exit /b 1
)

echo [INFO] Starting backend API and WebSocket on http://localhost:8000
echo [INFO] WebSocket endpoint: ws://localhost:8000/ws/chat/
python -m uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload

pause
