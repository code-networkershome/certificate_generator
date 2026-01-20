@echo off
echo ============================================
echo Certificate Builder - Backend Setup
echo ============================================

cd /d "%~dp0backend"

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ============================================
echo Setup complete! Run the backend with:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn main:app --reload --port 8000
echo ============================================
pause
