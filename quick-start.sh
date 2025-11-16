#!/bin/bash

# Quick Start Script for Development
# This script helps you quickly set up the bot for local development

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║  VPN Bot - Quick Start (Development) ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Let's create one!${NC}"
    echo ""
    
    # Database selection
    echo "Choose your database type:"
    echo "  1 - SQLite (Recommended for development)"
    echo "  2 - PostgreSQL (Remote)"
    echo "  3 - Supabase"
    echo ""
    read -p "Enter your choice (1-3): " db_choice
    
    case $db_choice in
        1)
            DB_TYPE="sqlite"
            DB_CONFIG="DATABASE_PATH=./database.db"
            ;;
        2)
            DB_TYPE="postgres"
            read -p "PostgreSQL connection URL: " pg_url
            DB_CONFIG="DATABASE_URL=$pg_url"
            ;;
        3)
            DB_TYPE="supabase"
            read -p "Supabase URL: " sb_url
            read -p "Supabase API Key: " sb_key
            DB_CONFIG="SUPABASE_URL=$sb_url
SUPABASE_API_KEY=$sb_key"
            ;;
        *)
            echo "Invalid choice. Using SQLite."
            DB_TYPE="sqlite"
            DB_CONFIG="DATABASE_PATH=./database.db"
            ;;
    esac
    
    echo ""
    read -p "Telegram Bot Token: " bot_token
    read -p "Your Telegram ID (admin): " admin_id
    read -p "Outline API URL: " outline_url
    
    # Create .env file
    cat > .env << ENVEOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=$bot_token
ADMIN_IDS=$admin_id

# Outline VPN Configuration
OUTLINE_API_URL=$outline_url

# Database Configuration
DATABASE_TYPE=$DB_TYPE
$DB_CONFIG

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
ENVEOF
    
    echo -e "${GREEN}✅ .env file created!${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

echo ""

# Initialize database if needed
if [ -f init-database.sh ]; then
    DB_TYPE=$(grep "^DATABASE_TYPE=" .env | cut -d '=' -f2)
    if [ "$DB_TYPE" != "sqlite" ]; then
        echo -e "${BLUE}🗄️  Initialize database? (y/n)${NC}"
        read -p "> " init_db
        if [ "$init_db" = "y" ]; then
            chmod +x init-database.sh
            ./init-database.sh
        fi
    fi
fi

echo ""
echo -e "${GREEN}🚀 Starting bot in development mode...${NC}"
echo ""

# Start the bot
npm run dev
