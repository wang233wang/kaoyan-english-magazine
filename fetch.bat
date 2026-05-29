@echo off
echo Fetching articles...
cd /d "%~dp0server"
node scripts/fetchArticles.js
echo Done!
timeout /t 3 /nobreak >nul
