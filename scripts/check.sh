#!/bin/bash

# Setup Verification Script
# Checks if the bot is properly configured and ready to run

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

checks_passed=0
checks_failed=0

echo -e "${BLUE}"
echo "╔════════════════════════════════╗"
echo "║  VPN Bot - Setup Verification  ║"
echo "╚════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to check
check() {
    local name=$1
    local command=$2
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ $name${NC}"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌ $name${NC}"
        ((checks_failed++))
        return 1
    fi
}

# Function to check with output
check_with_msg() {
    local name=$1
    local command=$2
    local error_msg=$3
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ $name${NC}"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌ $name${NC}"
        if [ -n "$error_msg" ]; then
            echo -e "${YELLOW}   → $error_msg${NC}"
        fi
        ((checks_failed++))
        return 1
    fi
}

echo -e "${BLUE}[1/4] Checking Dependencies${NC}"
check "Node.js installed" "command -v node"
if command -v node &>/dev/null; then
    node_version=$(node --version)
    echo -e "    Version: $node_version"
fi

check "npm installed" "command -v npm"
if command -v npm &>/dev/null; then
    npm_version=$(npm --version)
    echo -e "    Version: $npm_version"
fi

check "Docker installed (optional)" "command -v docker"
check "Docker Compose installed (optional)" "command -v docker-compose"

echo ""
echo -e "${BLUE}[2/4] Checking Project Files${NC}"
check_with_msg "package.json exists" "test -f package.json" "Run 'npm install'"
check_with_msg "node_modules exists" "test -d node_modules" "Run 'npm install'"
check_with_msg "src directory exists" "test -d src" "Source code missing"
check "Database models exist" "test -f src/models/SupabaseDatabase.js"

echo ""
echo -e "${BLUE}[3/4] Checking Configuration${NC}"

if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    ((checks_passed++))
    
    # Load .env
    export $(cat .env | grep -v '^#' | xargs)
    
    # Check required variables
    check_with_msg "TELEGRAM_BOT_TOKEN set" "test -n \"$TELEGRAM_BOT_TOKEN\"" "Set in .env file"
    check_with_msg "ADMIN_IDS set" "test -n \"$ADMIN_IDS\"" "Set in .env file"
    check_with_msg "OUTLINE_API_URL set" "test -n \"$OUTLINE_API_URL\"" "Set in .env file"
    check_with_msg "DATABASE_TYPE set" "test -n \"$DATABASE_TYPE\"" "Set in .env file"
    
    # Database-specific checks
    case $DATABASE_TYPE in
        sqlite)
            echo -e "${BLUE}   Database: SQLite${NC}"
            check_with_msg "DATABASE_PATH set" "test -n \"$DATABASE_PATH\"" "Set in .env file"
            ;;
        postgres)
            echo -e "${BLUE}   Database: PostgreSQL${NC}"
            check_with_msg "DATABASE_URL set" "test -n \"$DATABASE_URL\"" "Set in .env file"
            if command -v psql &>/dev/null; then
                check "PostgreSQL client available" "command -v psql"
            else
                echo -e "${YELLOW}⚠️  PostgreSQL client (psql) not found${NC}"
                echo -e "    Install: sudo apt-get install postgresql-client"
            fi
            ;;
        supabase)
            echo -e "${BLUE}   Database: Supabase${NC}"
            check_with_msg "SUPABASE_URL set" "test -n \"$SUPABASE_URL\"" "Set in .env file"
            check_with_msg "SUPABASE_API_KEY set" "test -n \"$SUPABASE_API_KEY\"" "Set in .env file"
            ;;
        *)
            echo -e "${RED}❌ Unknown DATABASE_TYPE: $DATABASE_TYPE${NC}"
            ((checks_failed++))
            ;;
    esac
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}   → Create from template: cp .env.example .env${NC}"
    ((checks_failed++))
fi

echo ""
echo -e "${BLUE}[4/4] Checking Database${NC}"

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    
    case $DATABASE_TYPE in
        sqlite)
            if [ -n "$DATABASE_PATH" ]; then
                if [ -f "$DATABASE_PATH" ]; then
                    echo -e "${GREEN}✅ SQLite database file exists${NC}"
                    ((checks_passed++))
                else
                    echo -e "${YELLOW}⚠️  SQLite database file will be created on first run${NC}"
                fi
            fi
            ;;
        postgres|supabase)
            if [ -f migrations/init.sql ]; then
                echo -e "${GREEN}✅ Database migration file exists${NC}"
                ((checks_passed++))
                
                if command -v psql &>/dev/null && [ -n "$DATABASE_URL" ]; then
                    if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
                        echo -e "${GREEN}✅ Database connection successful${NC}"
                        ((checks_passed++))
                    else
                        echo -e "${RED}❌ Cannot connect to database${NC}"
                        echo -e "${YELLOW}   → Check DATABASE_URL and network${NC}"
                        ((checks_failed++))
                    fi
                else
                    echo -e "${YELLOW}⚠️  Cannot test database connection${NC}"
                    echo -e "    (psql not installed or DATABASE_URL not set)"
                fi
            else
                echo -e "${RED}❌ Migration file not found${NC}"
                ((checks_failed++))
            fi
            ;;
    esac
fi

echo ""
echo -e "${BLUE}═══════════════════════════════${NC}"
echo -e "Summary: ${GREEN}$checks_passed passed${NC}, ${RED}$checks_failed failed${NC}"
echo -e "${BLUE}═══════════════════════════════${NC}"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your bot is ready to run.${NC}"
    echo ""
    echo "Start the bot with:"
    echo "  Development: npm run dev"
    echo "  Production:  npm start"
    echo "  Docker:      docker-compose up -d"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some checks failed. Please fix the issues above.${NC}"
    echo ""
    echo "Need help? Check:"
    echo "  - INSTALLATION.md for setup instructions"
    echo "  - README.md for configuration details"
    exit 1
fi
