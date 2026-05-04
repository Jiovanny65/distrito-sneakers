@echo off
title Distrito Sneakers - Abrir Tienda
echo.
echo  ========================================
echo    DISTRITO SNEAKERS - Abriendo tienda...
echo  ========================================
echo.
start "" "%~dp0index.html"
echo  Tienda abierta en tu navegador.
echo.
timeout /t 2 >nul
exit
