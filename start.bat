@echo off
echo ========================================
echo   Starting Kaoyan English Magazine...
echo ========================================
echo.
echo   Make sure your phone is on the same WiFi
echo   as this computer, then open the URL shown
echo   in the server window on your phone.
echo ========================================
echo.

start "Kaoyan-English" cmd /k "node server/index.js"

timeout /t 3 /nobreak >nul

start http://localhost:3001
