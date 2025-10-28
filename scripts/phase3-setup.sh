#!/bin/bash
# Phase 3 Environment Setup Script
# Feature: 011-ai-agent-architecture
# Purpose: Prepare environment for n8n workflow creation

set -e

echo "========================================="
echo "Phase 3 Setup: AI Agent Architecture"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_service() {
    local name=$1
    local url=$2
    echo -n "Checking $name... "
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -qE "^(200|404)"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

check_db() {
    echo -n "Checking PostgreSQL... "
    if pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

check_file() {
    local file=$1
    local desc=$2
    echo -n "Checking $desc... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Exists${NC}"
        return 0
    else
        echo -e "${RED}✗ Missing${NC}"
        return 1
    fi
}

# Load environment variables if .env exists
if [ -f "mcp-server/.env" ]; then
    echo "Loading environment from mcp-server/.env"
    set -a
    source mcp-server/.env
    set +a
else
    echo -e "${YELLOW}⚠ No .env file found. Using defaults.${NC}"
fi

echo ""
echo "1. Checking Prerequisites"
echo "-------------------------"

# Check services
ALL_OK=true
check_service "Vikunja API" "${VIKUNJA_API_URL:-http://localhost:3456}/health" || ALL_OK=false
check_service "n8n" "http://localhost:5678" || ALL_OK=false
check_db || ALL_OK=false

# Check PostgreSQL tables
echo -n "Checking PostgreSQL tables... "
TABLES_OK=true
for table in agent_conversations conversation_messages tool_execution_logs agent_configurations; do
    if ! psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-n8n_memory}" -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
        TABLES_OK=false
        break
    fi
done

if [ "$TABLES_OK" = true ]; then
    echo -e "${GREEN}✓ All tables exist${NC}"
else
    echo -e "${RED}✗ Missing tables${NC}"
    echo -e "${YELLOW}   Run: psql -h localhost -U postgres -d n8n_memory -f specs/011-ai-agent-architecture/sql/setup_all.sql${NC}"
    ALL_OK=false
fi

# Check MCP server dependencies
echo -n "Checking MCP server dependencies... "
if [ -d "mcp-server/node_modules" ] && [ -d "mcp-server/node_modules/pg" ]; then
    echo -e "${GREEN}✓ Installed${NC}"
else
    echo -e "${RED}✗ Missing${NC}"
    echo -e "${YELLOW}   Run: cd mcp-server && pnpm install${NC}"
    ALL_OK=false
fi

# Check documentation
echo ""
echo "2. Checking Documentation"
echo "-------------------------"
check_file "n8n-workflows/SETUP_GUIDE.md" "Setup Guide" || ALL_OK=false
check_file "n8n-workflows/README.md" "Workflows README" || ALL_OK=false
check_file "n8n-workflows/prompts/supervisor.md" "Supervisor Prompt" || ALL_OK=false
check_file "n8n-workflows/prompts/vikunja-specialist.md" "Specialist Prompt" || ALL_OK=false

echo ""
echo "3. Environment Configuration"
echo "----------------------------"

if [ ! -f "mcp-server/.env" ]; then
    echo -e "${YELLOW}⚠ No .env file found. Creating from .env.example...${NC}"
    cp mcp-server/.env.example mcp-server/.env
    echo -e "${YELLOW}   Please edit mcp-server/.env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check required environment variables
VARS_OK=true
echo "Checking required variables:"
for var in VIKUNJA_API_URL DB_HOST DB_NAME DB_USER DB_PASSWORD; do
    echo -n "  $var: "
    if [ -z "${!var}" ]; then
        echo -e "${RED}Not set${NC}"
        VARS_OK=false
    else
        # Mask password
        if [ "$var" = "DB_PASSWORD" ]; then
            echo -e "${GREEN}***${NC}"
        else
            echo -e "${GREEN}${!var}${NC}"
        fi
    fi
done

if [ "$VARS_OK" = false ]; then
    echo -e "${YELLOW}   Configure these in mcp-server/.env${NC}"
    ALL_OK=false
fi

echo ""
echo "4. MCP Server Status"
echo "--------------------"

if pgrep -f "tsx.*src/index.ts" > /dev/null; then
    echo -e "${GREEN}✓ MCP server is running${NC}"
    check_service "MCP HTTP Transport" "http://localhost:${MCP_HTTP_PORT:-3458}/health" || echo -e "${YELLOW}   Note: May need to enable HTTP transport${NC}"
else
    echo -e "${RED}✗ MCP server not running${NC}"
    echo -e "${YELLOW}   Start with: cd mcp-server && pnpm dev${NC}"
    ALL_OK=false
fi

echo ""
echo "========================================="
echo "Setup Summary"
echo "========================================="

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✓ All prerequisites met!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open n8n: http://localhost:5678"
    echo "2. Follow setup guide: cat n8n-workflows/SETUP_GUIDE.md"
    echo "3. Create supervisor workflow (T022)"
    echo "4. Create Vikunja specialist workflow (T023)"
    echo "5. Test with scenarios from SETUP_GUIDE.md"
else
    echo -e "${RED}✗ Some prerequisites missing${NC}"
    echo ""
    echo "Fix the issues above, then run this script again."
fi

echo ""
echo "Reference Documents:"
echo "  - Setup Guide: n8n-workflows/SETUP_GUIDE.md"
echo "  - README: n8n-workflows/README.md"
echo "  - Phase Summary: specs/011-ai-agent-architecture/PHASE3_SUMMARY.md"
echo ""
