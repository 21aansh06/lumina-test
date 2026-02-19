#!/bin/bash

echo "🌟 LUMINA DEPLOYMENT SCRIPT"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    echo -e "${RED}❌ Error: Please run this script from the lumina root directory${NC}"
    exit 1
fi

echo "✅ Directory structure verified"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version is $NODE_VERSION. Recommended: 18+${NC}"
fi

echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Check environment files
echo "🔧 Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  server/.env not found. Creating from example...${NC}"
    cp server/.env.example server/.env
    echo -e "${YELLOW}⚠️  Please update server/.env with your actual API keys${NC}"
fi

if [ ! -f "client/.env" ]; then
    echo -e "${YELLOW}⚠️  client/.env not found. Creating from example...${NC}"
    cp client/.env.example client/.env
    echo -e "${YELLOW}⚠️  Please update client/.env with your actual API keys${NC}"
fi

echo -e "${GREEN}✅ Environment files ready${NC}"
echo ""

# Check if MongoDB is running
echo "🗄️  Checking MongoDB..."
if command_exists mongod; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB is running locally${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB is installed but not running${NC}"
        echo "   Start it with: mongod"
        echo "   Or use MongoDB Atlas for cloud database"
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB not found locally${NC}"
    echo "   You'll need MongoDB Atlas (cloud) or install MongoDB locally"
fi
echo ""

# Generate JWT secret if not set
if grep -q "your_jwt_secret_key_here" server/.env; then
    echo "🔑 Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    # Replace the JWT_SECRET line in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your_jwt_secret_key_here/$JWT_SECRET/g" server/.env
    else
        # Linux
        sed -i "s/your_jwt_secret_key_here/$JWT_SECRET/g" server/.env
    fi
    echo -e "${GREEN}✅ JWT secret generated${NC}"
    echo ""
fi

# Display configuration summary
echo "📊 Configuration Summary:"
echo "========================"
echo ""

if grep -q "demo" server/.env || grep -q "your_" server/.env; then
    echo -e "${YELLOW}⚠️  Using DEMO/API keys - Some features will be limited${NC}"
    echo ""
    echo "For full functionality, update these in server/.env:"
    grep -E "^GOOGLE|^MONGODB|^MAPBOX" server/.env | grep -E "(demo|your_)" | while read line; do
        echo "   ❌ $line"
    done
    echo ""
    echo "💡 You can still test the app with demo login!"
else
    echo -e "${GREEN}✅ All API keys configured${NC}"
fi

echo ""
echo "🚀 Starting LUMINA..."
echo "====================="
echo ""

# Start the application
if command_exists concurrently; then
    npm run dev
else
    echo "Installing concurrently..."
    npm install -g concurrently
    npm run dev
fi

# This line runs if npm run dev exits
echo ""
echo -e "${RED}❌ Application stopped${NC}"
echo "Press Enter to exit..."
read