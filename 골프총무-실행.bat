@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title 골프총무 (Golf Director)
cd /d "%~dp0backend"

echo ============================================
echo   ⛳ 골프총무 (Golf Director) 시작합니다
echo ============================================
echo.

REM --- 1) Node.js 설치 확인 ---
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js가 설치되어 있지 않습니다.
  echo     https://nodejs.org 에서 "LTS" 버전을 설치한 뒤
  echo     이 파일을 다시 더블클릭하세요.
  echo.
  pause
  exit /b
)

REM --- 2) 최초 1회 라이브러리 설치 ---
if not exist node_modules (
  echo [1/3] 처음이라 준비 작업을 합니다. 1~2분 걸려요. 잠시만 기다려주세요...
  call npm install
  echo.
)

REM --- 3) API 키 최초 1회 입력 ---
if not exist .env (
  echo [2/3] Anthropic API 키를 한 번만 입력하면 됩니다.
  echo       (https://console.anthropic.com 에서 발급, sk-ant- 로 시작)
  echo.
  set /p "APIKEY=여기에 키를 붙여넣고 Enter: "
  (
    echo ANTHROPIC_API_KEY=!APIKEY!
    echo PORT=8787
  ) > .env
  echo  ✔ 저장했어요. 다음부터는 안 물어봅니다.
  echo.
)

REM --- 4) 대시보드 열고 서버 시작 ---
echo [3/3] 대시보드를 열고 서버를 시작합니다...
start "" "%~dp0frontend\index.html"
echo.
echo  ✔ 준비 완료! 이 검은 창은 그냥 두세요 (닫으면 AI가 멈춥니다).
echo    대시보드는 잠시 뒤 자동으로 "백엔드 연결됨" 표시가 뜹니다.
echo.
call npm start

pause
