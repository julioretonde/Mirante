@echo off
rem Duplo clique para jogar Ascenda (Windows).
chcp 65001 >nul
title Ascenda
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   O Node.js nao esta instalado neste computador.
  echo   Instale a versao LTS em https://nodejs.org e depois de um duplo clique aqui de novo.
  echo.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)
call npm start
pause
