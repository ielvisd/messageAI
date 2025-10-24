#!/bin/bash

echo "🔍 Checking for Supabase environment variables..."
echo ""

# Check for .env files
echo "📁 Looking for .env files..."
if [ -f .env ]; then
  echo "✅ Found .env"
  echo "Contents (hiding sensitive values):"
  cat .env | sed 's/=.*/=***HIDDEN***/'
else
  echo "❌ No .env file found"
fi

if [ -f .env.local ]; then
  echo "✅ Found .env.local"
  echo "Contents (hiding sensitive values):"
  cat .env.local | sed 's/=.*/=***HIDDEN***/'
else
  echo "❌ No .env.local file found"
fi

echo ""
echo "🔐 Checking environment variables..."
echo "VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-NOT SET}"
echo "VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:+***SET***}"
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:+***SET***}"

echo ""
echo "💡 To set up database access:"
echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database"
echo "2. Copy the 'Connection string' (URI format)"
echo "3. Create a .env file with:"
echo "   SUPABASE_DB_URL=your-connection-string"
echo "   VITE_SUPABASE_URL=your-project-url"
echo "   VITE_SUPABASE_ANON_KEY=your-anon-key"

