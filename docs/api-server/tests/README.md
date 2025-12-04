# CMS V2 API Testing Guide

## 📋 Available Test Resources

### 1. Test Matrix (완전한 테스트 계획)
**File**: `cms_v2_test_matrix.md`

25개 테스트 케이스를 포함한 상세한 테스트 매트릭스:
- CustomPostType CRUD (5 tests)
- CustomField CRUD (4 tests)
- View Management (3 tests)
- Page Publishing Workflow (7 tests)
- Error Handling (4 tests)
- Performance Testing (2 tests)

### 2. Automated Test Runner (자동화 스크립트)
**File**: `cms_api_test_runner.sh`

모든 CMS API 엔드포인트를 자동으로 테스트하는 Bash 스크립트

---

## 🚀 Quick Start

### Option 1: 자동 테스트 실행

```bash
cd /home/dev/o4o-platform/docs/api-server/tests

# Admin 계정으로 테스트 실행
./cms_api_test_runner.sh admin@neture.co.kr YOUR_PASSWORD

# 또는 다른 admin 계정으로
./cms_api_test_runner.sh admin@dropship.com YOUR_PASSWORD
```

**출력 예시**:
```
🔐 CMS V2 API Test Runner
==========================
Environment: https://api.neture.co.kr
Admin Email: admin@neture.co.kr

📝 Step 1: Authenticating...
✅ Authentication successful
Token: eyJhbGciOiJIUzI1NiI...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Suite 1: CustomPostType CRUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Test 1: Create CPT (blog_post)
   ✅ PASS (Status: 201)
   {"success":true,"data":{"id":"...

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests:  14
✅ Passed:    14
❌ Failed:    0

🎉 All tests passed!
```

---

### Option 2: 수동 테스트 (curl)

#### Step 1: JWT 토큰 획득
```bash
# Login
curl -X POST https://api.neture.co.kr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@neture.co.kr",
    "password": "YOUR_PASSWORD"
  }'

# Response에서 token 추출
export JWT_TOKEN="eyJhbGci..."
```

#### Step 2: CPT 생성 테스트
```bash
curl -X POST https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog_post",
    "name": "Blog Post",
    "schema": {
      "fields": [
        {"name": "title", "type": "text", "required": true}
      ]
    },
    "status": "active"
  }'
```

#### Step 3: CPT 목록 조회
```bash
curl https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Step 4: Public Page 테스트 (No Auth)
```bash
curl https://api.neture.co.kr/api/v1/cms/public/page/test-page
```

---

## 📊 Test Coverage

### Endpoints Tested (14 total)

| Category | Endpoints | Status |
|----------|-----------|--------|
| **CPT** | POST/GET/PUT/DELETE /cpts | ✅ |
| **Fields** | POST/GET /fields | ✅ |
| **Views** | POST/GET /views | ✅ |
| **Pages** | POST/GET/PUT /pages | ✅ |
| **Publishing** | PUT /pages/:id/publish | ✅ |
| **Public** | GET /public/page/:slug | ✅ |

### Validation Checks

- ✅ HTTP status codes
- ✅ Response JSON structure
- ✅ Authentication/Authorization
- ✅ Data persistence
- ✅ Error handling
- ✅ ViewRenderer schema compatibility

---

## 🧪 Manual Test Scenarios

### Scenario 1: Create Complete Blog System

```bash
# 1. Create CPT
CPT_RESPONSE=$(curl -s -X POST https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog",
    "name": "Blog Articles",
    "schema": {"fields": [...]},
    "status": "active"
  }')

CPT_ID=$(echo $CPT_RESPONSE | jq -r '.data.id')

# 2. Add Custom Field
curl -X POST https://api.neture.co.kr/api/v1/cms/fields \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"postTypeId\": \"$CPT_ID\",
    \"name\": \"featured_image\",
    \"label\": \"Featured Image\",
    \"type\": \"image\"
  }"

# 3. Create View Template
VIEW_RESPONSE=$(curl -s -X POST https://api.neture.co.kr/api/v1/cms/views \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog_list",
    "name": "Blog List View",
    "type": "page",
    "schema": {
      "version": "2.0",
      "components": [...]
    },
    "status": "active"
  }')

VIEW_ID=$(echo $VIEW_RESPONSE | jq -r '.data.id')

# 4. Create Page
PAGE_RESPONSE=$(curl -s -X POST https://api.neture.co.kr/api/v1/cms/pages \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"blog\",
    \"title\": \"Blog\",
    \"viewId\": \"$VIEW_ID\",
    \"content\": {...},
    \"status\": \"draft\"
  }")

PAGE_ID=$(echo $PAGE_RESPONSE | jq -r '.data.id')

# 5. Publish Page
curl -X PUT https://api.neture.co.kr/api/v1/cms/pages/$PAGE_ID/publish \
  -H "Authorization: Bearer $JWT_TOKEN"

# 6. Access Published Page (Public)
curl https://api.neture.co.kr/api/v1/cms/public/page/blog
```

---

### Scenario 2: Test Publishing Workflow

```bash
# 1. Create draft page
PAGE_ID="..."

# 2. Check status is draft
curl https://api.neture.co.kr/api/v1/cms/pages/$PAGE_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq '.data.status'
# Output: "draft"

# 3. Try to access publicly (should fail)
curl https://api.neture.co.kr/api/v1/cms/public/page/test
# Output: {"success": false, "error": "Page not found or not published"}

# 4. Publish
curl -X PUT https://api.neture.co.kr/api/v1/cms/pages/$PAGE_ID/publish \
  -H "Authorization: Bearer $JWT_TOKEN"

# 5. Access publicly (should work)
curl https://api.neture.co.kr/api/v1/cms/public/page/test
# Output: {"success": true, "data": {...}}

# 6. Archive
curl -X PUT https://api.neture.co.kr/api/v1/cms/pages/$PAGE_ID/archive \
  -H "Authorization: Bearer $JWT_TOKEN"

# 7. Public access removed
curl https://api.neture.co.kr/api/v1/cms/public/page/test
# Output: {"success": false, "error": "Page not found or not published"}
```

---

## 🐛 Troubleshooting

### Error: "Authentication required"
**Solution**: JWT 토큰이 만료되었거나 잘못됨. 다시 로그인하여 새 토큰 획득.

```bash
curl -X POST https://api.neture.co.kr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@neture.co.kr", "password": "..."}'
```

### Error: "Slug already exists"
**Solution**: 다른 slug 사용 또는 기존 리소스 삭제

```bash
# Delete existing CPT
curl -X DELETE https://api.neture.co.kr/api/v1/cms/cpts/:id \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Error: "Page not found"
**Solution**:
1. 페이지가 published 상태인지 확인
2. slug가 정확한지 확인
3. viewId가 유효한지 확인

---

## 📈 Performance Benchmarks

Expected response times:
- POST /cpts: < 200ms
- GET /cpts: < 100ms
- POST /pages: < 300ms
- GET /public/page/:slug: < 150ms

Run performance test:
```bash
# Measure response time
time curl https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 📝 Test Data Cleanup

After testing, clean up test data:

```bash
# List all test resources
curl https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq '.data[] | select(.slug | contains("test"))'

# Delete test CPTs
curl -X DELETE https://api.neture.co.kr/api/v1/cms/cpts/:id \
  -H "Authorization: Bearer $JWT_TOKEN"

# Delete test pages
curl -X DELETE https://api.neture.co.kr/api/v1/cms/pages/:id \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 🚦 Next Steps

After successful testing:

1. ✅ Document any API quirks/limitations found
2. ✅ Create sample CMS data for ViewRenderer integration
3. ✅ Proceed to **Phase C-2.4**: ViewRenderer Integration
4. ✅ Start building Admin Dashboard CMS UI

---

## 📞 Support

**Issues**: Report test failures in development chat
**Docs**: See `cms_v2_test_matrix.md` for detailed test cases
**API Docs**: See Swagger at https://api.neture.co.kr/api-docs

---

*Last Updated: 2025-12-04*
*Phase: C-2.3 - CMS API Testing*
