@echo off
echo Starting Smart Aquarium Dev Servers...
echo.

set CONDA_ENV=aquarium

:: Start backend in a new terminal window (with conda env activated)
start "Backend - FastAPI :8000" cmd /k "call conda activate %CONDA_ENV% && cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

:: Brief pause so backend gets a head start
timeout /t 3 /nobreak >nul

:: Start frontend in a new terminal window
start "Frontend - Vite :5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend  -^> http://127.0.0.1:8000   (conda env: %CONDA_ENV%)
echo Frontend -^> http://localhost:5173
echo API docs -^> http://127.0.0.1:8000/docs
echo.
echo Both servers started in separate windows.
pause
