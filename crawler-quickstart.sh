#!/bin/bash

# Quick Start Script for RapidGigs Crawler
# Usage: ./crawler-quickstart.sh

set -e

echo "🚀 RapidGigs Website Crawler - Quick Start"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}1. Checking if backend is running...${NC}"
if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo "Start it with: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Test 1: Quick Generate (No crawling needed)
echo -e "${BLUE}2. Testing Quick Generate (generate videos from text)...${NC}"
echo ""

JOB_DESCRIPTION="Senior Full Stack Engineer at innovative tech startup. Build scalable applications with Node.js, React, and TypeScript. 5+ years experience required. \$120k-150k salary, remote work, equity included. Apply now!"

echo "Sending request..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/crawler/quick-generate \
  -H "Content-Type: application/json" \
  -d "{
    \"jobDescription\": \"$JOB_DESCRIPTION\"
  }")

echo "Response: $RESPONSE"
echo ""
echo -e "${GREEN}✅ Request accepted. Videos are being generated in the background...${NC}"
echo ""

# Test 2: List jobs
echo -e "${BLUE}3. Checking active jobs...${NC}"
JOBS_RESPONSE=$(curl -s http://localhost:5000/api/crawler/jobs)
echo "$JOBS_RESPONSE" | jq '.' || echo "$JOBS_RESPONSE"
echo ""

# Test 3: Schedule a crawl (optional)
echo -e "${BLUE}4. Optional: Schedule a recurring crawl${NC}"
echo ""
echo "Example cron intervals:"
echo "  '0 9 * * *'      - Daily at 9 AM"
echo "  '*/5 * * * *'    - Every 5 minutes"
echo "  '0 */6 * * *'    - Every 6 hours"
echo ""
read -p "Do you want to schedule a crawl? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter target URL (default: http://localhost:3000/jobs): " TARGET_URL
    TARGET_URL=${TARGET_URL:-http://localhost:3000/jobs}
    
    read -p "Enter cron interval (default: 0 9 * * *): " INTERVAL
    INTERVAL=${INTERVAL:-0 9 * * *}
    
    echo "Scheduling crawl..."
    SCHEDULE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/crawler/schedule \
      -H "Content-Type: application/json" \
      -d "{
        \"interval\": \"$INTERVAL\",
        \"targetUrl\": \"$TARGET_URL\"
      }")
    
    echo "$SCHEDULE_RESPONSE" | jq '.' || echo "$SCHEDULE_RESPONSE"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Quick start complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Videos are being generated. Check again in 30-60 seconds"
echo "2. View results: curl http://localhost:5000/api/crawler/jobs"
echo "3. For full crawling, use: curl -X POST http://localhost:5000/api/crawler/crawl"
echo ""
echo "📚 Full documentation: cat CRAWLER_GUIDE.md"
echo ""
