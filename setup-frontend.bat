@echo off
echo ============================================
echo Certificate Builder - Frontend Setup
echo ============================================

cd /d "%~dp0frontend"

echo Installing dependencies...
call npm install

echo.
echo ============================================
echo Setup complete! Run the frontend with:
echo   cd frontend
echo   npm run dev
echo ============================================
pause
