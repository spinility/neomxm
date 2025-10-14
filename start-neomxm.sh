#!/bin/bash
set -e -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Show help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "NeoMXM Startup Script"
    echo ""
    echo "Usage: ./start-neomxm.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --rebuild, -r    Rebuild both cortex-server and sketch-neomxm"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "This script:"
    echo "  1. Loads configuration from .env"
    echo "  2. Builds cortex-server and sketch-neomxm if needed"
    echo "  3. Starts Cortex server on port 8181"
    echo "  4. Starts sketch-neomxm connected to Cortex"
    echo ""
    echo "Requirements:"
    echo "  - .env file with at least one API key configured"
    echo "  - Run from /app directory"
    echo ""
    exit 0
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NeoMXM Startup Script              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "cortex" ] || [ ! -d "sketch-neomxm" ]; then
    echo -e "${RED}❌ Error: Must be run from /app directory${NC}"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating template...${NC}"
    cat > .env << 'ENVEOF'
# NeoMXM Configuration
# Edit this file with your real API keys

# API Keys (AT LEAST ONE required)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
DEEPSEEK_API_KEY=your-key-here

# Cortex Configuration
CORTEX_ENABLED=true
CORTEX_PROFILES_DIR=/app/cortex/profiles
CORTEX_LOGS_DIR=/app/cortex/logs

# Model Selection (optional overrides)
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5
CORTEX_MODEL_ELITE=claude-opus-4

# Cortex Server
CORTEX_URL=http://localhost:8181
ENVEOF
    echo -e "${GREEN}✓ Created .env template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env with your real API keys, then run this script again${NC}"
    echo ""
    echo "Example:"
    echo "  nano .env"
    echo "  # Add your keys, save, then:"
    echo "  ./start-neomxm.sh"
    exit 0
fi

# Load environment variables
echo -e "${BLUE}📋 Loading configuration from .env...${NC}"
source .env

# Check if at least one API key is set
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${RED}❌ Error: No API keys configured in .env${NC}"
    echo "   Please set at least one of:"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - DEEPSEEK_API_KEY"
    exit 1
fi

if [ "$ANTHROPIC_API_KEY" = "sk-ant-your-key-here" ] || \
   [ "$OPENAI_API_KEY" = "sk-your-key-here" ] || \
   [ "$DEEPSEEK_API_KEY" = "your-key-here" ]; then
    echo -e "${RED}❌ Error: Please replace placeholder API keys in .env with real ones${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration loaded${NC}"

# Check if rebuild flag is set
REBUILD=false
if [ "$1" = "--rebuild" ] || [ "$1" = "-r" ]; then
    REBUILD=true
    shift  # Remove flag from arguments
fi

# Build cortex-server if needed
if [ ! -f "cortex-server" ] || [ "$REBUILD" = true ]; then
    if [ "$REBUILD" = true ]; then
        echo -e "${YELLOW}🔨 Rebuilding cortex-server...${NC}"
    else
        echo -e "${YELLOW}⚠️  cortex-server not built. Building now...${NC}"
    fi
    go build -o cortex-server ./cortex/cmd/cortex-server/
    echo -e "${GREEN}✓ cortex-server built${NC}"
fi

# Build sketch-neomxm if needed
if [ ! -f "sketch-neomxm/sketch-neomxm" ] || [ "$REBUILD" = true ]; then
    if [ "$REBUILD" = true ]; then
        echo -e "${YELLOW}🔨 Rebuilding sketch-neomxm...${NC}"
    else
        echo -e "${YELLOW}⚠️  sketch-neomxm not built. Building now...${NC}"
    fi
    cd sketch-neomxm
    make
    cd ..
    echo -e "${GREEN}✓ sketch-neomxm built${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p cortex/logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down NeoMXM...${NC}"
    if [ ! -z "$CORTEX_PID" ]; then
        kill $CORTEX_PID 2>/dev/null || true
    fi
    if [ ! -z "$SKETCH_PID" ]; then
        kill $SKETCH_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Cortex Server in background
echo ""
echo -e "${BLUE}🚀 Starting Cortex Server on port 8181...${NC}"
./cortex-server > cortex-server.log 2>&1 &
CORTEX_PID=$!

# Wait for cortex to be ready
echo -e "${YELLOW}⏳ Waiting for Cortex to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8181/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Cortex Server is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Error: Cortex Server failed to start${NC}"
        echo "   Check cortex-server.log for details"
        kill $CORTEX_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
    echo -n "."
done

# Show which experts are available
echo ""
echo -e "${BLUE}🧠 Available Experts:${NC}"
if command -v jq >/dev/null 2>&1; then
    curl -s http://localhost:8181/experts 2>/dev/null | jq -r '.experts[] | "   - \(.name) (\(.model)) - Tier \(.tier)"' 2>/dev/null || echo "   (Could not fetch experts list)"
else
    echo "   (jq not installed, skipping expert list)"
fi

# Start sketch-neomxm in foreground
echo ""
echo -e "${BLUE}🎨 Starting sketch-neomxm...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}✓ Cortex Server:${NC} http://localhost:8181"
echo -e "  ${GREEN}✓ sketch-neomxm:${NC} Starting..."
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • All AI requests will route through Cortex"
echo -e "   • Check cortex-server.log for routing logs"
echo -e "   • Press Ctrl+C to shutdown everything"
echo -e "   • Run with --rebuild to rebuild binaries"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Change to the sketch-neomxm directory and launch
cd "${PWD}/sketch-neomxm" || {
    echo -e "${RED}❌ Error: Cannot change to sketch-neomxm directory${NC}"
    exit 1
}

# Verify the binary exists
if [ ! -x "./sketch-neomxm" ]; then
    echo -e "${RED}❌ Error: sketch-neomxm binary not found or not executable${NC}"
    echo "   Path: $(pwd)/sketch-neomxm"
    exit 1
fi

export CORTEX_URL=http://localhost:8181
exec ./sketch-neomxm -skaband-addr= "$@"
