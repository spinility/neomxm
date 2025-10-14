#!/bin/bash
set -e

# Load SSH key if available
if [ -f "$HOME/.ssh/id_ed25519" ]; then
    echo -e "${BLUE}🔐 Loading SSH key...${NC}"
    eval "$(ssh-agent -s)" >/dev/null 2>&1
    ssh-add "$HOME/.ssh/id_ed25519" >/dev/null 2>&1 || {
        echo -e "${YELLOW}⚠️  Could not load SSH key (maybe passphrase required)${NC}"
    }
else
    echo -e "${YELLOW}⚠️  No SSH key found at ~/.ssh/id_ed25519${NC}"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if binaries exist
if [ ! -f "cortex-server" ]; then
    echo -e "${RED}❌ Error: cortex-server binary not found${NC}"
    echo "   Run: go build -o cortex-server ./cortex/cmd/cortex-server/"
    exit 1
fi

if [ ! -f "sketch-neomxm/sketch" ]; then
    echo -e "${YELLOW}⚠️  sketch-neomxm not built. Building now...${NC}"
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
curl -s http://localhost:8181/experts | jq -r '.experts[] | "   - \(.name) (\(.model)) - Tier \(.tier)"' 2>/dev/null || echo "   (Could not fetch experts list)"

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
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd sketch-neomxm
export CORTEX_URL=http://localhost:8181
exec ./sketch -skaband-addr="" "$@"
