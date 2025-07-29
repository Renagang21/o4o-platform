#!/bin/bash

# Forum E2E Test Runner Script
# This script runs only the forum-related E2E tests

echo "🚀 Starting Forum E2E Tests..."

# Check if admin dashboard is running
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "❌ Admin dashboard is not running on http://localhost:3001"
    echo "Please start the admin dashboard first with: npm run dev:admin"
    exit 1
fi

# Check if API server is running
if ! curl -s http://localhost:4000/health > /dev/null; then
    echo "❌ API server is not running on http://localhost:4000"
    echo "Please start the API server first with: npm run dev:api"
    exit 1
fi

echo "✅ Both admin dashboard and API server are running"
echo "🧪 Running Forum E2E Tests..."

# Run only the forum management E2E tests
npx playwright test src/test/e2e/forum-management.spec.ts --project=chromium

echo "📊 Forum E2E Tests completed!"