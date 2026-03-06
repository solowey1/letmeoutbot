#!/bin/bash

# =============================================
# Database Initialization Script
# =============================================
# This script initializes the database based on
# the DATABASE_TYPE environment variable
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    log_error ".env file not found. Please create it first."
    exit 1
fi

# Check DATABASE_TYPE
if [ -z "$DATABASE_TYPE" ]; then
    log_error "DATABASE_TYPE not set in .env file"
    exit 1
fi

log_info "Database type: $DATABASE_TYPE"

# Initialize based on database type
case $DATABASE_TYPE in
    sqlite)
        log_info "SQLite database will be created automatically by the application"
        log_success "No manual initialization needed for SQLite"
        ;;
        
    postgres)
        log_info "Initializing PostgreSQL database..."
        
        # Check if psql is installed
        if ! command -v psql &> /dev/null; then
            log_error "psql command not found. Please install PostgreSQL client:"
            echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
            echo "  macOS: brew install postgresql"
            exit 1
        fi
        
        # Check if DATABASE_URL is set
        if [ -z "$DATABASE_URL" ]; then
            log_error "DATABASE_URL not set in .env file"
            exit 1
        fi
        
        # Run migrations
        log_info "Running database migrations..."
        psql "$DATABASE_URL" -f migrations/init.sql
        
        log_success "PostgreSQL database initialized successfully"
        ;;
        
    supabase)
        log_info "Initializing Supabase database..."
        
        # Check if psql is installed
        if ! command -v psql &> /dev/null; then
            log_error "psql command not found. Please install PostgreSQL client:"
            echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
            echo "  macOS: brew install postgresql"
            exit 1
        fi
        
        # For Supabase, we need to construct the connection string from SUPABASE_URL
        # or use the direct DATABASE_URL if provided
        if [ -z "$DATABASE_URL" ]; then
            log_error "DATABASE_URL not set for Supabase connection"
            log_info "Get your connection string from:"
            log_info "Supabase Dashboard → Settings → Database → Connection string → URI"
            exit 1
        fi
        
        # Run migrations
        log_info "Running database migrations..."
        psql "$DATABASE_URL" -f migrations/init.sql
        
        log_success "Supabase database initialized successfully"
        ;;
        
    *)
        log_error "Unknown DATABASE_TYPE: $DATABASE_TYPE"
        log_error "Valid options: sqlite, postgres, supabase"
        exit 1
        ;;
esac

echo ""
log_success "Database initialization complete!"
echo ""
log_info "You can now start the bot with:"
echo "  docker-compose up -d (for development)"
echo "  docker-compose -f docker-compose.prod.yml up -d (for production)"
