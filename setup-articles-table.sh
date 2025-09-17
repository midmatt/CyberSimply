#!/bin/bash

# Setup script for CyberSimply articles table
# This script creates the articles table and related structures in Supabase

echo "🚀 Setting up CyberSimply articles table..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

# Run the migration
echo "📝 Running articles table migration..."
supabase db reset --db-url "$SUPABASE_DB_URL" < supabase/articles-table.sql

if [ $? -eq 0 ]; then
    echo "✅ Articles table setup completed successfully!"
    echo ""
    echo "📋 What was created:"
    echo "   - articles table with all required columns"
    echo "   - article_metrics table for tracking views/favorites"
    echo "   - article_details view combining articles and metrics"
    echo "   - Indexes for better performance"
    echo "   - Row Level Security policies"
    echo "   - Sample articles for testing"
    echo ""
    echo "🎉 Your app should now be able to fetch articles from Supabase!"
else
    echo "❌ Failed to setup articles table. Please check the error messages above."
    exit 1
fi
