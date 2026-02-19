@echo off
chcp 65001 >nul
echo 🌟 LUMINA DEPLOYMENT SCRIPT
echo ============================
echo.

REM Check if running from correct directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the lumina root directory
    pause
    exit /b 1
)

if not exist "server" (
    echo ❌ Error: Please run this script from the lumina root directory
    pause
    exit /b 1
)

if not exist "client" (
    echo ❌ Error: Please run this script from the lumina root directory
    pause
    exit /b 1
)

echo ✅ Directory structure verified
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1" %%a in ('node -v') do set NODE_VERSION=%%a
echo ✅ Node.js %NODE_VERSION% installed
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm run install:all
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Check environment files
echo 🔧 Checking environment configuration...

if not exist "server\.env" (
    echo ⚠️  server\.env not found. Creating from example...
    copy server\.env.example server\.env
    echo ⚠️  Please update server\.env with your actual API keys
)

if not exist "client\.env" (
    echo ⚠️  client\.env not found. Creating from example...
    copy client\.env.example client\.env
    echo ⚠️  Please update client\.env with your actual API keys
)

echo ✅ Environment files ready
echo.

REM Check MongoDB
where mongod >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MongoDB not found locally
    echo    You'll need MongoDB Atlas ^(cloud^) or install MongoDB locally
) else (
    echo ✅ MongoDB found
)
echo.

REM Display configuration summary
echo 📊 Configuration Summary:
echo ========================
echo.

REM Check for demo keys
findstr /C:"demo" server\.env >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Using DEMO/API keys - Some features will be limited
    echo.
    echo For full functionality, update these in server\.env:
    findstr /B "GOOGLE MONGODB MAPBOX" server\.env | findstr /C:"demo" /C:"your_"
    echo.
    echo 💡 You can still test the app with demo login!
) else (
    echo ✅ All API keys configured
)

echo.
echo 🚀 Starting LUMINA...
echo =====================
echo.
echo The application will start in a few seconds...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
echo.

REM Start the application
npm run dev

REM This line runs if npm run dev exits
echo.
echo ❌ Application stopped
pause