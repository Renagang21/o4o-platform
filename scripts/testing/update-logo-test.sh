#!/bin/bash

# Test script to update header template part with a logo URL

API_URL="http://localhost:4000"
LOGO_URL="https://storage.googleapis.com/your-bucket/logo.png"

echo "🔍 Step 1: Fetching existing header template part..."
HEADER_DATA=$(curl -s "$API_URL/api/public/template-parts")

# Extract header ID
HEADER_ID=$(echo "$HEADER_DATA" | python3 -c "
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
echo "🔍 Step 2: Preparing updated header with logo URL..."

# Create updated header JSON with logo URL
UPDATE_JSON=$(cat <<EOF
{
  "name": "Default Header",
  "slug": "default-header",
  "description": "Default site header with logo, navigation menu, and search",
  "area": "header",
  "content": [
    {
      "id": "header-container",
      "type": "o4o/group",
      "data": {
        "layout": "flex",
        "flexDirection": "row",
        "justifyContent": "space-between",
        "alignItems": "center",
        "className": "site-header",
        "padding": {
          "top": "16px",
          "bottom": "16px",
          "left": "24px",
          "right": "24px"
        }
      },
      "innerBlocks": [
        {
          "id": "site-logo",
          "type": "core/site-logo",
          "data": {
            "width": 120,
            "isLink": true,
            "linkTarget": "_self",
            "logoUrl": "$LOGO_URL"
          }
        },
        {
          "id": "navigation-container",
          "type": "o4o/group",
          "data": {
            "layout": "flex",
            "flexDirection": "row",
            "gap": "32px",
            "alignItems": "center"
          },
          "innerBlocks": [
            {
              "id": "primary-menu",
              "type": "core/navigation",
              "data": {
                "menuRef": "primary-menu",
                "orientation": "horizontal",
                "showSubmenuIcon": true
              }
            },
            {
              "id": "header-search",
              "type": "core/search",
              "data": {
                "label": "Search",
                "showLabel": false,
                "placeholder": "Search...",
                "buttonPosition": "button-inside"
              }
            }
          ]
        }
      ]
    }
  ],
  "settings": {
    "containerWidth": "wide",
    "backgroundColor": "#ffffff",
    "textColor": "#333333",
    "padding": {
      "top": "0",
      "bottom": "0"
    }
  }
}
EOF
)

echo "$UPDATE_JSON" > /tmp/header-update.json

echo "📝 Saved to /tmp/header-update.json"
echo ""
echo "To update via API (requires auth token):"
echo "curl -X PUT \"$API_URL/api/template-parts/$HEADER_ID\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer YOUR_TOKEN\" \\"
echo "  -d @/tmp/header-update.json"
