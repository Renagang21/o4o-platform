# IR-O4O-CONTENT-EDITOR-PIPELINE-AUDIT-V1

> **조사일**: 2026-03-13
> **목적**: Content 제작 파이프라인(Editor → Save → Publish → Display) 실동작 검증
> **트리거**: Community 사용자 콘텐츠 제작 기능 적용 전 인프라 검증

---

## 1. 핵심 발견 요약

### Editor 현황: 하이브리드 패턴 (통합 1개 + 관리자 전용 3개)

| Editor | 라이브러리 | 위치 | 용도 | 출력 형식 |
|--------|-----------|------|------|----------|
| **RichTextEditor** | TipTap v2.1 | `@o4o/content-editor` | Forum (전 서비스 공유) | Block[] JSON |
| Gutenberg Block Editor | 커스텀 | admin-dashboard | CMS 페이지/템플릿 | Block[] JSON |
| Slate Editor | Slate v0.118 | admin-dashboard (Gutenberg 내부) | 텍스트 블록 편집 | Slate Node[] |
| Monaco Editor | Monaco | admin-dashboard | 코드 편집 | Plain text |

### 치명적 발견: CMS body 저장 형식 불일치

| 시스템 | body 형식 | 렌더링 방법 |
|--------|----------|-----------|
| **Forum** | `Block[]` (JSONB) | `blocksToHtml()` → `dangerouslySetInnerHTML` |
| **CMS Content** | **Plain text (string)** | `body.split('\n')` → `<p>` 태그 |

**CMS Content의 body는 plain text이다.** Rich formatting, 이미지 삽입, 목록 등 지원 불가.

### Community 사용자 콘텐츠 제작: 미구현

- `POST /api/v1/cms/contents` → admin/service_admin만 가능 (403 Forbidden)
- `authorRole='community'` enum은 정의되어 있지만 **사용하는 코드 경로 없음**
- 사용자 콘텐츠 제출 → 승인 파이프라인 미구현

---

## 2. Editor 상세 분석

### 2.1 통합 Editor: RichTextEditor (`@o4o/content-editor`)

**패키지**: `packages/content-editor/src/components/RichTextEditor.tsx`

```typescript
export function RichTextEditor({
  value, onChange, onSave, placeholder,
  editable, autoSaveInterval, minHeight
})
```

**TipTap 확장**:
- starter-kit (paragraph, heading, list, code)
- underline, link, image, youtube
- text-align, highlight, text-style, color, placeholder

**사용처**:
- `services/web-neture/src/pages/forum/ForumWritePage.tsx`
- `services/web-kpa-society/src/pages/forum/ForumWritePage.tsx`
- (모든 서비스의 Forum에서 공유)

**출력**: TipTap HTML → `htmlToBlocks()` → `Block[]` (JSONB)

### 2.2 Admin Gutenberg Editor

**위치**: `apps/admin-dashboard/src/components/editor/O4OBlockEditor.tsx`

- WordPress Gutenberg 스타일 블록 에디터
- 내부에서 Slate.js 사용 (텍스트 블록)
- CMS 페이지/템플릿 빌더용
- **Forum과 공유하지 않음**

### 2.3 CMS Content 작성 폼 (ContentFormModal)

**위치**: `apps/admin-dashboard/src/pages/cms/contents/ContentFormModal.tsx`

**중요: Rich Editor를 사용하지 않는다.**

폼 필드:
- title (텍스트 입력)
- summary (텍스트에어리어)
- imageUrl (URL 입력)
- linkUrl, linkText
- backgroundColor (Hero 타입용)
- sortOrder, isPinned, isOperatorPicked

**body 필드를 편집하는 UI가 없다.** P0 범위에서는 hero/notice 타입만 지원하며, 이들은 title + summary + imageUrl로 충분하기 때문.

---

## 3. 콘텐츠 저장 구조

### 3.1 CmsContent Entity

```
cms_contents
├── body: TEXT (plain text, 줄바꿈 기반)
├── imageUrl: VARCHAR(500) (단일 이미지)
├── status: 'draft' | 'pending' | 'published' | 'archived'
├── authorRole: 'admin' | 'service_admin' | 'supplier' | 'community'
└── visibilityScope: 'platform' | 'service' | 'organization'
```

### 3.2 ForumPost Entity (비교)

```
forum_post
├── content: JSONB (Block[] 배열)
├── 인라인 이미지 지원 (Block 내 image 타입)
├── status: 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'ARCHIVED'
└── rich formatting 완전 지원
```

### 3.3 body 형식 차이의 영향

| 기능 | CMS (plain text) | Forum (Block[]) |
|------|-----------------|-----------------|
| 굵은 글씨 | ❌ | ✅ |
| 이미지 삽입 | ❌ (imageUrl 필드만) | ✅ (블록 내) |
| 목록 | ❌ | ✅ |
| 링크 | ❌ (linkUrl 필드만) | ✅ |
| 코드 블록 | ❌ | ✅ |
| YouTube | ❌ | ✅ |

---

## 4. 콘텐츠 상태 흐름

```
draft → pending (승인 요청)
draft → archived (폐기)
pending → published (승인, publishedAt 설정)
pending → draft (반려)
published → archived (만료)
archived → (최종 상태)
```

**권한**:
- 상태 전환: `requireAdmin`만 가능
- 일반 사용자: 상태 변경 불가

---

## 5. 이미지 업로드

### 업로드 API

**Controller**: `apps/api-server/src/controllers/media/mediaUploadController.ts`
**Middleware**: `apps/api-server/src/middleware/upload.middleware.ts`

### 저장 위치

**로컬 파일시스템**: `public/uploads/{type}/`

| 파일 유형 | 크기 제한 |
|----------|----------|
| 이미지 | 10MB |
| 비디오 | 100MB |
| 오디오 | 50MB |
| 문서 | 25MB |

**GCS/S3 미사용** — 로컬 저장소만 사용

### 이미지 처리

- Sharp 라이브러리로 리사이즈/최적화
- 프론트엔드 업로드 컴포넌트:
  - `admin-dashboard/src/components/editor/blocks/image/ImageUploader.tsx`
  - `admin-dashboard/src/components/editor/blocks/shared/MediaSelector.tsx`

---

## 6. 콘텐츠 표시 구조

### ContentDetailPage (Neture Web)

**파일**: `services/web-neture/src/pages/content/ContentDetailPage.tsx`

```tsx
// body 렌더링 — plain text를 줄바꿈 기준으로 분리
{content.body ? (
  <div className="prose prose-gray max-w-none">
    {content.body.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-4 text-gray-700 leading-relaxed">
        {paragraph}
      </p>
    ))}
  </div>
) : (
  <p className="text-gray-600">{content.summary || '내용이 없습니다.'}</p>
)}
```

### ForumPostPage (비교)

```tsx
// Block[] → HTML 변환 후 렌더링
function contentToHtml(content: string | object[] | undefined): string {
  if (Array.isArray(content)) {
    return blocksToHtml(content as any);  // Block[] → HTML
  }
  // legacy: escape + newline → <br/>
}

<article dangerouslySetInnerHTML={{ __html: contentToHtml(post.content) }} />
```

---

## 7. Admin 제작 파이프라인 검증

### ✅ 관리자 E2E 파이프라인: 동작 확인

```
Admin Dashboard → ContentFormModal
  ↓ POST /api/v1/cms/contents (type, title, summary, imageUrl)
Database: status='draft'
  ↓ PATCH /api/v1/cms/contents/:id/status {status:'published'}
Database: status='published', publishedAt=NOW()
  ↓ GET /api/v1/neture/content (public)
ContentListPage → ContentDetailPage
```

**결론**: 관리자 콘텐츠 제작 → 게시 → 표시 파이프라인은 **정상 동작**.
단, body는 plain text이며 rich content 미지원.

### ❌ Community 사용자 제작 파이프라인: 미구현

| 구성 요소 | 상태 |
|-----------|------|
| 사용자 콘텐츠 작성 UI | ❌ 없음 |
| 사용자 콘텐츠 제출 API | ❌ 없음 (403) |
| 승인 워크플로우 | ❌ 미구현 |
| authorRole='community' 설정 | ❌ 코드 경로 없음 |
| 커뮤니티 콘텐츠 표시 필터 | ✅ API 지원 (데이터만 없음) |

---

## 8. 결론 및 권고

### Editor 답변: **2계통 존재**

```
계통 1: TipTap RichTextEditor (@o4o/content-editor)
  → Forum 전용, Block[] 출력, 모든 서비스 공유

계통 2: Admin Gutenberg + Slate + Monaco
  → Admin Dashboard 전용, 페이지/템플릿 빌더
```

**CMS Content에는 Editor가 연결되어 있지 않다.** (ContentFormModal에 Rich Editor 없음)

### 기술 부채 판단

| 항목 | 위험도 | 설명 |
|------|--------|------|
| CMS body plain text | **높음** | Rich content 불가, 향후 마이그레이션 필요 |
| 이미지 로컬 저장 | **중간** | Cloud Run 환경에서 영속성 문제 가능 |
| Editor 2계통 | **낮음** | 용도가 다르므로 (사용자 vs 관리자) 의도적 분리 가능 |
| Community 제작 미구현 | **판단 보류** | 별도 WO로 구현 필요 |

### Community 콘텐츠 제작을 위한 필요 작업

```
Option A: Forum 기반 (권장)
  → ForumPost를 Community 콘텐츠로 활용
  → TipTap Editor 재사용 (이미 완성)
  → 승인: ForumCategory.requireApproval 활용
  → 장점: 인프라 완성, 즉시 사용 가능

Option B: CMS 확장
  → POST /api/v1/cms/contents에 community 권한 추가
  → TipTap Editor를 CMS 작성에 연동
  → body 형식을 Block[]로 변경
  → 장점: 통합 콘텐츠 관리
  → 단점: body 마이그레이션 + 신규 API 필요
```

**권장: Option A** — Forum 시스템이 이미 사용자 콘텐츠 제작의 전체 파이프라인을 갖추고 있음.

---

*조사 완료: 2026-03-13*
*다음 단계: WO-O4O-COMMUNITY-CONTENT-CREATION-V1 설계 시 이 조사 결과 참조*
