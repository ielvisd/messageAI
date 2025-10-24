#!/bin/bash

echo "🚀 MessageAI Gym - Quick Start Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Copy migrations
echo -e "${BLUE}Step 1: Preparing migrations...${NC}"
cd messageAI-Quasar
cat supabase/migrations/20251025*.sql | pbcopy
echo -e "${GREEN}✅ Migrations copied to clipboard!${NC}"
echo ""
echo -e "${YELLOW}Now paste into Supabase SQL Editor:${NC}"
echo "https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/sql"
echo ""
read -p "Press Enter after you've applied the migrations..."

# Step 2: Deploy Edge Functions
echo ""
echo -e "${BLUE}Step 2: Deploying Edge Functions...${NC}"
echo "Deploying gym-ai-assistant..."
npx supabase functions deploy gym-ai-assistant

echo "Deploying send-invitation-email..."
npx supabase functions deploy send-invitation-email

echo ""
echo -e "${GREEN}✅ Edge Functions deployed!${NC}"

# Step 3: Set secrets
echo ""
echo -e "${BLUE}Step 3: Setting environment variables...${NC}"
echo -e "${YELLOW}You'll need:${NC}"
echo "  - OPENAI_API_KEY (for AI assistant)"
echo "  - FRONTEND_URL (for invitation links)"
echo ""
read -p "Enter your OpenAI API key: " OPENAI_KEY
read -p "Enter your frontend URL (e.g., http://localhost:9000): " FRONTEND_URL

npx supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
npx supabase secrets set FRONTEND_URL="$FRONTEND_URL"

echo ""
echo -e "${GREEN}✅ Secrets configured!${NC}"

# Step 4: Test locally
echo ""
echo -e "${BLUE}Step 4: Starting local dev server...${NC}"
echo ""
echo -e "${YELLOW}The app will open at http://localhost:9000${NC}"
echo -e "${YELLOW}You can now:${NC}"
echo "  1. Sign up as first user (becomes owner)"
echo "  2. Create your gym at /setup/gym"
echo "  3. Invite users (instructor, student, parent)"
echo "  4. Test AI at /ai-assistant"
echo ""
read -p "Press Enter to start dev server (Ctrl+C to exit)..."

quasar dev

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "For production iOS build:"
echo "  quasar build -m capacitor -T ios"
echo ""
echo "For PWA build:"
echo "  quasar build -m pwa"

