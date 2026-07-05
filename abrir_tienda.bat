@echo off
title Speed Style CL - Abrir Tienda
echo.
echo  ========================================
echo    SPEED STYLE CL - Abriendo tienda...
echo  ========================================
echo.
start "" "%~dp0index.html"
echo  Tienda abierta en tu navegador.
echo.
timeout /t 2 >nul
exit
