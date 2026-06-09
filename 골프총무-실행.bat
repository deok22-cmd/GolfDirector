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

REM --- 3) 최초 1회 환경설정(.env) 자동 생성 ---
if not exist .env (
  echo [2/3] 최초 설정을 만듭니다...
  (
    echo JWT_SECRET=gd-!RANDOM!!RANDOM!!RANDOM!!RANDOM!
    echo PORT=8787
    echo ANTHROPIC_API_KEY=
  ) > .env
  echo  ✔ 완료. (견적서 AI 기능은 나중에 .env의 ANTHROPIC_API_KEY를 채우면 켜져요)
  echo.
)

REM --- 4) 브라우저 열고 서버 시작 ---
echo [3/3] 골프총무를 시작합니다...
start "" "%~dp0frontend\index.html"
echo.
echo  ✔ 준비 완료! 이 검은 창은 그냥 두세요 (닫으면 서버가 멈춰요).
echo    브라우저에서 회원가입 후 여행을 만들면 됩니다.
echo    (주소창에 http://localhost:8787 을 쳐도 됩니다)
echo.
call npm start

pause
