# Phase D-3: End-to-End Test Checklist

**목적**: CMS V2 전체 흐름 (Designer → API → ViewRenderer → Preview/Public) 검증

**테스트 일시**: 2025-12-05
**테스터**: Rena
**예상 소요 시간**: 30-45분

---

## 🎯 테스트 목표

다음 전체 흐름이 정상 작동하는지 확인:

1. ✅ CMS CPT/Field 생성
2. ✅ View Template 생성 (Designer 사용)
3. ✅ Page 생성 및 View 연결
4. ✅ Designer에서 블록 편집 및 저장
5. ✅ Preview 모드 렌더링 확인
6. ✅ Publish 후 Public 렌더링 확인
7. ✅ SEO meta 태그 확인
8. ✅ CMS Blocks 동적 데이터 확인

---

## 📋 Step-by-Step Checklist

### Part 1: CMS 기본 데이터 생성

#### ✅ Step 1.1: CPT 생성 (Blog Post)

1. 브라우저에서 **Admin Dashboard** 접속
   ```
   https://admin.neture.co.kr
   ```

2. 로그인 (관리자 계정)

3. 사이드바에서 **CMS → Custom Post Types** 클릭

4. **"Create CPT"** 버튼 클릭

5. 다음 정보 입력:
   - **Name**: `Blog Post`
   - **Slug**: `blog-post` (자동 생성됨)
   - **Description**: `Test CPT for Phase D-3 E2E testing`
   - **Icon**: `FileText`
   - **Status**: `Active`
   - **Public**: `ON` (체크)
   - **Hierarchical**: `OFF`

6. **"Create CPT"** 버튼 클릭

7. ✅ **확인사항**:
   - [ ] 성공 토스트 메시지 표시
   - [ ] CPT 목록 페이지로 리다이렉트
   - [ ] "Blog Post" CPT가 목록에 표시됨

---

#### ✅ Step 1.2: Custom Fields 생성 (선택 사항)

1. **CMS → Custom Fields** 클릭

2. **"Create Field"** 버튼 클릭

3. **Field #1 - Title** 입력:
   - **Post Type**: `Blog Post` (드롭다운에서 선택)
   - **Name**: `title`
   - **Label**: `Title`
   - **Type**: `Text`
   - **Group Name**: `Basic Info`
   - **Order**: `0`
   - **Required**: `ON`

4. **"Create Field"** 버튼 클릭

5. 같은 방법으로 **Field #2 - Excerpt** 생성:
   - **Name**: `excerpt`
   - **Label**: `Excerpt`
   - **Type**: `Textarea`
   - **Group Name**: `Basic Info`
   - **Order**: `1`
   - **Required**: `OFF`

6. ✅ **확인사항**:
   - [ ] 두 개의 필드가 성공적으로 생성됨
   - [ ] Fields 목록에서 "Blog Post" 필터 시 두 필드 표시

---

### Part 2: View Template 생성

#### ✅ Step 2.1: 빈 View 생성

1. **CMS → Views** 클릭

2. **"Create View"** 버튼 클릭

3. 다음 정보 입력:
   - **Name**: `E2E Test View`
   - **Slug**: `e2e-test-view`
   - **Description**: `View template for Phase D-3 testing`
   - **Type**: `page`
   - **Post Type**: `(비워둠)`
   - **Status**: `Active`

4. **"Create View"** 버튼 클릭

5. ✅ **확인사항**:
   - [ ] 성공 토스트 메시지
   - [ ] View 목록에 "E2E Test View" 표시
   - [ ] View ID 기억 (예: `view_xxx`)

---

#### ✅ Step 2.2: Designer에서 블록 추가

1. View 목록에서 **"E2E Test View"** 행의 **"Edit"** 버튼 클릭

2. Designer 화면이 열림

3. **왼쪽 Palette**에서 다음 블록들을 **Canvas**에 드래그:

   **a) Hero 블록**
   - Palette → Layout → "Hero" 드래그
   - Inspector에서 설정:
     - Title: `Welcome to E2E Test`
     - Subtitle: `Testing CMS V2 Full Stack`
     - Background Color: `#3B82F6` (파란색)
     - Text Align: `center`

   **b) Section 블록**
   - Palette → Layout → "Section" 드래그
   - Inspector:
     - Padding: `large`
     - Background: `#F9FAFB`

   **c) TwoColumn 블록** (Section 안에)
   - Section 블록을 **클릭하여 선택**
   - Palette → Layout → "TwoColumn" 드래그 (Section 안으로)
   - Inspector:
     - Column Ratio: `1:1`
     - Gap: `medium`

   **d) Heading 블록** (왼쪽 컬럼에)
   - TwoColumn의 **첫 번째 컬럼** 클릭
   - Palette → Basic → "Heading" 드래그
   - Inspector:
     - Text: `Latest Blog Posts`
     - Level: `h2`
     - Color: `#111827`

   **e) RecentPosts 블록** (왼쪽 컬럼에)
   - Palette → CMS → "RecentPosts" 드래그 (Heading 아래)
   - Inspector:
     - Post Type: `blog-post`
     - Limit: `5`
     - Show Thumbnail: `ON`
     - Show Excerpt: `ON`

   **f) Heading 블록** (오른쪽 컬럼에)
   - TwoColumn의 **두 번째 컬럼** 클릭
   - Palette → Basic → "Heading" 드래그
   - Inspector:
     - Text: `Categories`
     - Level: `h2`

   **g) CategoryList 블록** (오른쪽 컬럼에)
   - Palette → CMS → "CategoryList" 드래그
   - Inspector:
     - Post Type: `blog-post`
     - Show Count: `ON`
     - Limit: `10`

4. **상단 Toolbar**에서 **"Save"** 버튼 클릭

5. ✅ **확인사항**:
   - [ ] 저장 성공 토스트 메시지
   - [ ] Canvas에 블록들이 계층 구조로 표시
   - [ ] Inspector에서 각 블록 선택 시 올바른 설정 표시

---

### Part 3: Page 생성 및 연결

#### ✅ Step 3.1: Page 생성

1. **CMS → Pages** 클릭

2. **"Create Page"** 버튼 클릭

3. 다음 정보 입력:
   - **Title**: `My First E2E Test Page`
   - **Slug**: `e2e-test-page`
   - **View Template**: `E2E Test View` (드롭다운에서 선택)
   - **Status**: `Draft`
   - **SEO Title**: `E2E Test Page - CMS V2`
   - **SEO Description**: `This is a test page for Phase D-3 end-to-end testing`
   - **Tags**: `test, e2e, cms-v2`

4. **"Save as Draft"** 버튼 클릭

5. ✅ **확인사항**:
   - [ ] 성공 토스트 메시지
   - [ ] Pages 목록에 "My First E2E Test Page" 표시
   - [ ] Status가 "Draft"로 표시

---

### Part 4: Preview 모드 테스트

#### ✅ Step 4.1: Preview 접속

1. Pages 목록에서 **"My First E2E Test Page"** 행의 **"Preview"** 버튼 클릭
   - 또는 직접 URL 접속:
     ```
     https://neture.co.kr/e2e-test-page?preview=1
     ```

2. 새 탭이 열리며 페이지 렌더링

3. ✅ **확인사항**:
   - [ ] Hero 섹션이 파란색 배경으로 렌더링
   - [ ] "Welcome to E2E Test" 제목 표시
   - [ ] Section이 회색 배경으로 렌더링
   - [ ] 두 개의 컬럼이 1:1 비율로 표시
   - [ ] 왼쪽: "Latest Blog Posts" 제목 + RecentPosts 블록
   - [ ] 오른쪽: "Categories" 제목 + CategoryList 블록
   - [ ] Console 에러 없음 (F12 → Console 탭 확인)

---

#### ✅ Step 4.2: CMS Blocks 데이터 확인

**RecentPosts 블록**:
- [ ] "No recent posts available" 또는 빈 상태 메시지 표시
  (아직 Blog Post 항목이 없으므로 정상)
- [ ] 블록 스타일이 정상 렌더링

**CategoryList 블록**:
- [ ] "No categories found" 또는 빈 상태 메시지 표시
- [ ] 블록 스타일이 정상 렌더링

4. **Chrome DevTools**로 Network 확인:
   - F12 → Network 탭
   - 페이지 새로고침 (Ctrl+R)
   - ✅ **확인사항**:
     - [ ] `/api/v1/cms/public/page/e2e-test-page` 요청 성공 (200)
     - [ ] Response에 view schema 포함
     - [ ] 추가 CMS API 호출 없음 (아직 데이터 없음)

---

### Part 5: Publish 및 Public 모드 테스트

#### ✅ Step 5.1: Page Publish

1. Admin Dashboard로 돌아가기

2. **CMS → Pages** 클릭

3. "My First E2E Test Page" 행의 **"Publish"** 버튼 클릭

4. Confirm 다이얼로그에서 **"Publish"** 확인

5. ✅ **확인사항**:
   - [ ] 성공 토스트 메시지
   - [ ] Status가 "Published"로 변경
   - [ ] Published At 날짜 표시

---

#### ✅ Step 5.2: Public 페이지 접속

1. 브라우저에서 **Public URL** 접속:
   ```
   https://neture.co.kr/e2e-test-page
   ```
   (주의: `?preview=1` 파라미터 **없이** 접속)

2. ✅ **확인사항**:
   - [ ] 페이지가 정상 렌더링 (Preview와 동일한 화면)
   - [ ] URL에 `?preview=1` 파라미터 없음
   - [ ] Console 에러 없음

---

#### ✅ Step 5.3: SEO Meta 태그 확인

1. Public 페이지에서 **F12** 열기

2. **Elements 탭** → `<head>` 섹션 확인

3. ✅ **확인사항**:
   - [ ] `<title>` 태그: `E2E Test Page - CMS V2`
   - [ ] `<meta name="description" content="This is a test page for Phase D-3 end-to-end testing">`
   - [ ] Open Graph 태그 (선택 사항):
     - `<meta property="og:title" content="E2E Test Page - CMS V2">`
     - `<meta property="og:description" content="...">`

4. **View Page Source** (Ctrl+U)로도 확인:
   - [ ] SEO 태그가 Server-Side에서 렌더링되었는지 확인

---

### Part 6: Designer 재편집 및 재확인

#### ✅ Step 6.1: Designer로 블록 추가

1. Admin Dashboard → **CMS → Views** → "E2E Test View" → **"Edit"**

2. Designer에서 **새 블록 추가**:

   **a) Button 블록** (Hero 안에)
   - Hero 블록 선택
   - Palette → Basic → "Button" 드래그
   - Inspector:
     - Text: `Get Started`
     - Variant: `primary`
     - Size: `large`
     - URL: `/contact`

   **b) Divider 블록** (Section 위에)
   - Section 블록 위치에 드래그
   - Inspector:
     - Type: `solid`
     - Color: `#E5E7EB`

3. **"Save"** 클릭

4. ✅ **확인사항**:
   - [ ] 저장 성공

---

#### ✅ Step 6.2: Public 페이지에서 변경 확인

1. **Public URL** 접속:
   ```
   https://neture.co.kr/e2e-test-page
   ```

2. 페이지 **새로고침** (Ctrl+R)

3. ✅ **확인사항**:
   - [ ] Hero 섹션에 "Get Started" 버튼 표시
   - [ ] Divider가 Section 위에 표시
   - [ ] 기존 블록들도 그대로 유지

---

### Part 7: CMS Blocks 실제 데이터 테스트

#### ✅ Step 7.1: 테스트용 Blog Post 생성

**주의**: 현재 시스템에는 Blog Post 생성 UI가 없을 수 있습니다.
이 경우 API로 직접 생성하거나, 이 단계를 **Skip**하고 다음 단계로 진행하세요.

**API로 Blog Post 생성** (선택 사항):

```bash
# 터미널에서 실행
curl -X POST https://api.neture.co.kr/api/v1/cms/blog-post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "First Test Blog Post",
    "slug": "first-test-blog-post",
    "content": {"excerpt": "This is a test blog post"},
    "status": "published"
  }'
```

---

#### ✅ Step 7.2: CMS Blocks 데이터 확인

1. Public 페이지 **새로고침**

2. **RecentPosts 블록** 확인:
   - [ ] "First Test Blog Post" 제목 표시
   - [ ] Excerpt 표시
   - [ ] 스타일 정상 렌더링

3. **CategoryList 블록** 확인:
   - [ ] 카테고리 목록 표시 (데이터가 있는 경우)

---

### Part 8: 오류 시나리오 테스트

#### ✅ Step 8.1: 404 페이지 테스트

1. 존재하지 않는 URL 접속:
   ```
   https://neture.co.kr/non-existent-page
   ```

2. ✅ **확인사항**:
   - [ ] 404 페이지 표시
   - [ ] Console 에러 없음
   - [ ] 적절한 fallback UI

---

#### ✅ Step 8.2: Draft 페이지 Public 접속 차단

1. Admin Dashboard에서 "My First E2E Test Page"를 **Draft**로 변경

2. Public URL 접속 시도:
   ```
   https://neture.co.kr/e2e-test-page
   ```

3. ✅ **확인사항**:
   - [ ] 404 또는 "Page not found" 표시
   - [ ] Preview URL은 여전히 작동: `?preview=1`

---

## 📊 테스트 결과 요약

### ✅ 성공 기준 (Definition of Done)

모든 항목이 체크되어야 함:

- [ ] CPT 생성 성공
- [ ] View Template 생성 및 Designer 편집 성공
- [ ] Page 생성 및 View 연결 성공
- [ ] Preview 모드 정상 렌더링
- [ ] Public 페이지 정상 렌더링
- [ ] SEO meta 태그 올바르게 주입
- [ ] Designer 재편집 → Public 반영 확인
- [ ] CMS Blocks 빈 상태 메시지 표시
- [ ] Console 에러 없음
- [ ] Network 요청 정상 (200 OK)

---

### 🐛 발견된 이슈

**이슈 #1**: (이슈 발견 시 작성)
- **증상**:
- **재현 방법**:
- **우선순위**: High / Medium / Low

**이슈 #2**:
...

---

### 📝 추가 메모

(테스트 중 발견한 개선 사항, 제안 등)

---

## ✅ 최종 체크

**Phase D-3 E2E 테스트 완료 여부**:
- [ ] 모든 테스트 단계 완료
- [ ] 모든 성공 기준 충족
- [ ] 발견된 이슈 문서화
- [ ] Phase D-4로 진행 가능

**테스트 완료 일시**: __________
**테스터 서명**: Rena

---

**다음 단계**: Phase D-4 - CMS 실제 콘텐츠 E2E 검증
