#!/bin/bash

# Apply SQL file to Supabase database
# Usage: ./scripts/apply-sql.sh <sql-file>
# Example: ./scripts/apply-sql.sh MIGRATIONS_TO_APPLY_MANUALLY.sql

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get SQL file from arguments
SQL_FILE="$1"

if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: Please provide a SQL file${NC}"
    echo "Usage: $0 <sql-file>"
    echo "Example: $0 MIGRATIONS_TO_APPLY_MANUALLY.sql"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: File not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📖 Reading SQL file: $SQL_FILE${NC}"
LINE_COUNT=$(wc -l < "$SQL_FILE")
echo -e "${GREEN}✅ Found $LINE_COUNT lines${NC}"

# Check if we have a linked Supabase project
if [ -f ".supabase/config.toml" ]; then
    echo -e "${BLUE}🔌 Using Supabase CLI (linked project)${NC}"
    
    # Try to use Supabase CLI
    if command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚡ Executing with Supabase CLI...${NC}"
        npx supabase db execute --file "$SQL_FILE" --db-url "$SUPABASE_DB_URL"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}🎉 Success! SQL executed via Supabase CLI${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Supabase CLI failed, trying psql...${NC}"
        fi
    fi
fi

# Check for database URL
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_DB_URL not found${NC}"
    echo ""
    echo "Please set your database connection string:"
    echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database"
    echo "2. Copy the 'Connection string' under 'Connection parameters'"
    echo "3. Run: export SUPABASE_DB_URL='your-connection-string'"
    echo ""
    echo "Or create a .env file with:"
    echo "SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"
    exit 1
fi

# Use psql if available
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚡ Executing with psql...${NC}"
    psql "$SUPABASE_DB_URL" -f "$SQL_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}🎉 Success! SQL executed via psql${NC}"
        exit 0
    else
        echo -e "${RED}❌ psql execution failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Neither Supabase CLI nor psql found${NC}"
    echo ""
    echo "Please install one of:"
    echo "1. PostgreSQL (includes psql): brew install postgresql"
    echo "2. Supabase CLI: npm install -g supabase"
    exit 1
fi




