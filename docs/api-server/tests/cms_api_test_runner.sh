#!/bin/bash

# CMS V2 API Test Runner
# Usage: ./cms_api_test_runner.sh <admin_email> <admin_password>

set -e

BASE_URL="https://api.neture.co.kr"
ADMIN_EMAIL="${1:-admin@neture.co.kr}"
ADMIN_PASSWORD="${2}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ Error: Admin password required"
  echo "Usage: ./cms_api_test_runner.sh <admin_email> <admin_password>"
  exit 1
fi

echo "🔐 CMS V2 API Test Runner"
echo "=========================="
echo "Environment: $BASE_URL"
echo "Admin Email: $ADMIN_EMAIL"
echo ""

# Step 1: Get JWT Token
echo "📝 Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Authentication failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo "Token: ${JWT_TOKEN:0:20}..."
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run test
run_test() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo "🧪 Test $TOTAL_TESTS: $test_name"

  if [ "$method" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Accept: application/json")
  elif [ "$method" = "POST" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "PUT" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Accept: application/json")
  fi

  HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_STATUS" = "$expected_status" ]; then
    echo "   ✅ PASS (Status: $HTTP_STATUS)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "$RESPONSE_BODY" | head -c 200
    echo "..."
  else
    echo "   ❌ FAIL (Expected: $expected_status, Got: $HTTP_STATUS)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "   Response: $RESPONSE_BODY"
  fi
  echo ""
}

# ======================
# Test Suite 1: CPT CRUD
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Suite 1: CustomPostType CRUD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# TC-1.1: Create CPT
run_test "Create CPT (blog_post)" "POST" "/api/v1/cms/cpts" \
'{
  "slug": "blog_post_test",
  "name": "Blog Post Test",
  "description": "Test blog post type",
  "schema": {
    "fields": [
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "type": "richtext",
        "required": true
      }
    ]
  },
  "status": "active"
}' "201"

# Extract CPT ID from last response
CPT_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "📌 Created CPT ID: $CPT_ID"
echo ""

# TC-1.2: List CPTs
run_test "List all CPTs" "GET" "/api/v1/cms/cpts" "" "200"

# TC-1.3: Get CPT by ID
if [ ! -z "$CPT_ID" ]; then
  run_test "Get CPT by ID" "GET" "/api/v1/cms/cpts/$CPT_ID" "" "200"
fi

# TC-1.4: Update CPT
if [ ! -z "$CPT_ID" ]; then
  run_test "Update CPT" "PUT" "/api/v1/cms/cpts/$CPT_ID" \
  '{
    "description": "Updated test blog post type",
    "status": "active"
  }' "200"
fi

# ======================
# Test Suite 2: Fields
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Suite 2: CustomField CRUD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# TC-2.1: Create Field
if [ ! -z "$CPT_ID" ]; then
  run_test "Create Custom Field (featured_image)" "POST" "/api/v1/cms/fields" \
  "{
    \"postTypeId\": \"$CPT_ID\",
    \"name\": \"featured_image\",
    \"label\": \"Featured Image\",
    \"type\": \"image\",
    \"groupName\": \"Media\",
    \"order\": 1,
    \"required\": false,
    \"config\": {
      \"maxSize\": 5242880,
      \"allowedTypes\": [\"image/jpeg\", \"image/png\"]
    }
  }" "201"

  FIELD_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "📌 Created Field ID: $FIELD_ID"
  echo ""
fi

# TC-2.2: List Fields
if [ ! -z "$CPT_ID" ]; then
  run_test "List Fields for CPT" "GET" "/api/v1/cms/fields?postTypeId=$CPT_ID" "" "200"
fi

# ======================
# Test Suite 3: Views
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Suite 3: View Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# TC-3.1: Create View
run_test "Create View Template" "POST" "/api/v1/cms/views" \
'{
  "slug": "blog_list_test",
  "name": "Blog List Test View",
  "description": "Test view template",
  "type": "page",
  "status": "active",
  "schema": {
    "version": "2.0",
    "type": "page",
    "components": [
      {
        "id": "hero-1",
        "type": "Hero",
        "props": {
          "title": "Test Blog"
        }
      }
    ]
  }
}' "201"

VIEW_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "📌 Created View ID: $VIEW_ID"
echo ""

# TC-3.2: List Views
run_test "List all Views" "GET" "/api/v1/cms/views" "" "200"

# ======================
# Test Suite 4: Pages
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Suite 4: Page CRUD & Publishing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# TC-4.1: Create Draft Page
if [ ! -z "$VIEW_ID" ]; then
  run_test "Create Draft Page" "POST" "/api/v1/cms/pages" \
  "{
    \"slug\": \"test-page-$(date +%s)\",
    \"title\": \"Test Page\",
    \"viewId\": \"$VIEW_ID\",
    \"content\": {
      \"heroTitle\": \"Welcome\",
      \"sections\": []
    },
    \"seo\": {
      \"title\": \"Test Page SEO\",
      \"description\": \"Test page description\"
    },
    \"status\": \"draft\"
  }" "201"

  PAGE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "📌 Created Page ID: $PAGE_ID"
  echo ""
fi

# TC-4.2: Publish Page
if [ ! -z "$PAGE_ID" ]; then
  run_test "Publish Page" "PUT" "/api/v1/cms/pages/$PAGE_ID/publish" "" "200"
fi

# TC-4.3: List Pages
run_test "List all Pages" "GET" "/api/v1/cms/pages" "" "200"

# TC-4.4: Get Page by ID
if [ ! -z "$PAGE_ID" ]; then
  run_test "Get Page by ID" "GET" "/api/v1/cms/pages/$PAGE_ID" "" "200"
fi

# ======================
# Cleanup
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cleanup (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Uncomment to delete test data
# if [ ! -z "$PAGE_ID" ]; then
#   run_test "Delete Page" "DELETE" "/api/v1/cms/pages/$PAGE_ID" "" "200"
# fi

# if [ ! -z "$FIELD_ID" ]; then
#   run_test "Delete Field" "DELETE" "/api/v1/cms/fields/$FIELD_ID" "" "200"
# fi

# if [ ! -z "$VIEW_ID" ]; then
#   run_test "Delete View" "DELETE" "/api/v1/cms/views/$VIEW_ID" "" "200"
# fi

# if [ ! -z "$CPT_ID" ]; then
#   run_test "Delete CPT" "DELETE" "/api/v1/cms/cpts/$CPT_ID" "" "200"
# fi

# ======================
# Summary
# ======================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo "✅ Passed:    $PASSED_TESTS"
echo "❌ Failed:    $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
