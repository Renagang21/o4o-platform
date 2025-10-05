#!/bin/bash

# Script to deactivate the default header template part
# This ensures that the header is only shown after admin explicitly publishes it

API_URL="http://localhost:4000"

echo "🔍 Finding default header template part..."

# Get header ID
HEADER_ID=$(curl -s "$API_URL/api/public/template-parts" | python3 -c "
import json, sys
data = json.load(sys.stdin)
headers = [p for p in data['data'] if p['area'] == 'header' and p['isDefault']]
if headers:
    print(headers[0]['id'])
" 2>/dev/null)

if [ -z "$HEADER_ID" ]; then
    echo "❌ No default header found"
    exit 1
fi

echo "✅ Found header ID: $HEADER_ID"
echo ""
echo "📝 This header needs to be deactivated via authenticated API"
echo "You need to:"
echo "1. Login to get auth token"
echo "2. PUT /api/template-parts/$HEADER_ID with {\"isActive\": false}"
echo ""
echo "Or manually via admin dashboard:"
echo "Go to: Appearance > Template Parts"
echo "Find: Default Header"
echo "Set: Active = No"
