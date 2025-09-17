#!/bin/bash

# Setup local cron job to fetch articles automatically
# Run this script once to set up automatic fetching

echo "🔄 Setting up local cron job for article fetching..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCH_SCRIPT="$SCRIPT_DIR/fetch-more-articles.js"

# Create a cron job that runs every 6 hours
# This will add the job to your crontab
(crontab -l 2>/dev/null; echo "0 */6 * * * cd $SCRIPT_DIR && node $FETCH_SCRIPT >> $SCRIPT_DIR/fetch-articles.log 2>&1") | crontab -

echo "✅ Cron job set up successfully!"
echo "📅 Articles will be fetched every 6 hours"
echo "📝 Logs will be saved to: $SCRIPT_DIR/fetch-articles.log"
echo ""
echo "To view your cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"
echo "To view logs: tail -f $SCRIPT_DIR/fetch-articles.log"
