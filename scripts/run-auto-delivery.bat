@echo off
REM Auto-Delivery Windows Batch Script
REM This script can be used with Windows Task Scheduler
REM to run the auto-delivery process on a schedule

REM Set the working directory to the project root
cd /d "%~dp0\.."

REM Set environment variables if not already set
if not defined AUTO_DELIVERY_API_URL set AUTO_DELIVERY_API_URL=http://localhost:3000/api/admin/auto-delivery
if not defined AUTO_DELIVERY_API_KEY set AUTO_DELIVERY_API_KEY=auto-delivery-secret-key

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Set log file with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%"
set AUTO_DELIVERY_LOG_FILE=logs\auto-delivery-%datestamp%.log

echo [%date% %time%] Starting auto-delivery process...
echo [%date% %time%] Log file: %AUTO_DELIVERY_LOG_FILE%

REM Run the Node.js script
node scripts\run-auto-delivery.js

REM Check exit code
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Auto-delivery process completed successfully
) else (
    echo [%date% %time%] Auto-delivery process failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [%date% %time%] Script finished