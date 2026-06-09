@echo off
title GolfDirector
cd /d "%~dp0backend"

echo ============================================
echo    GolfDirector - starting up...
echo ============================================
echo.

REM --- 1) Check Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is NOT installed.
  echo     Please install the "LTS" version from https://nodejs.org
  echo     then double-click this file again.
  echo.
  pause
  exit /b
)

REM --- 2) First-time install ---
if not exist node_modules (
  echo [1/3] First run: installing... please wait 1-2 minutes.
  call npm install
  echo.
)

REM --- 3) Create settings (.env) once ---
if not exist .env (
  echo [2/3] Creating settings...
  > .env echo JWT_SECRET=gd-%RANDOM%%RANDOM%%RANDOM%%RANDOM%
  >> .env echo PORT=8787
  >> .env echo ANTHROPIC_API_KEY=
  echo  Done.
  echo.
)

REM --- 4) Open browser and start server ---
echo [3/3] Opening browser and starting server...
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:8787"
echo.
echo  READY.  Keep this black window OPEN (closing it stops the server).
echo  The browser will open http://localhost:8787  -  sign up there.
echo.
call npm start

pause
