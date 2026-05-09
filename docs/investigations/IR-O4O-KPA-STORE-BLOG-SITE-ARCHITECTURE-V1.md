# IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1

**조사 일자**: 2026-05-09
**조사 기준**: main (`b2651f8f6` 시점, sync 완료)
**조사 범위**: KPA 매장 Blog — 관리/공개 페이지·entity/API·템플릿·매장 관계·다른 서비스 공통화 가능성
**조사자**: Claude Opus 4.7 (코드 수정 없음, 정적 분석)

---

## 0. 핵심 결론 (TL;DR)

> **현재 Blog는 "단순 게시판(A)" 위치이며, 코드 구조상 "콘텐츠 채널(B) + 매장 홍보 블로그(C)"로 자연스럽게 진화 가능하다. 그러나 "매장 미니 사이트(D)" 역할은 이미 `StorefrontHomePage`(`/store/:slug`)가 담당하고 있으므로 Blog를 별도 사이트로 부풀리는 것은 중복이다.**

판정: **A → B/C 정렬 권장, D는 비추천 (이미 다른 컴포넌트가 담당)**.

핵심 사실:
1. Blog 메타 entity 부재. 게시글 entity(`store_blog_posts`)만 존재.
2. 다중 템플릿 부재. 단일 layout 단일 theme. `BlogTemplates.tsx`(Modern/Emotional/Dry/Professional)는 prototype, 실제 데이터에 미연동.
3. SEO/meta/Helmet 부재.
4. 매장 정보(이름/로고/소개)가 Blog 페이지에 표시되지 않음.
5. **storeId + serviceKey 기반 멀티테넌트 설계** — Forum-core 같은 공통 패키지로 승격 가능한 상태.
6. Neture에 동일 entity 사용 사례 존재. GlycoPharm·K-Cosmetics는 미구현.

---

## 1. 현재 Blog 구조 요약

### 1.1 페이지·라우트
| 영역 | 컴포넌트 | 라우트 | 인증 |
|------|----------|--------|------|
| 관리 (operator) | [PharmacyBlogPage](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) | `/store/content/blog` ([App.tsx:886](services/web-kpa-society/src/App.tsx#L886)) | requireAuth |
| 공개 — 목록 | [StoreBlogPage](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx) | `/store/:storeSlug/blog` ([App.tsx:906](services/web-kpa-society/src/App.tsx#L906)) | 무인증 |
| 공개 — 상세 | [StoreBlogPostPage](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx) | `/store/:storeSlug/blog/:postSlug` ([App.tsx:907](services/web-kpa-society/src/App.tsx#L907)) | 무인증 |

### 1.2 관리 UX (구현 vs 부재)

| 기능 | 상태 | 위치 |
|------|------|------|
| 게시글 작성 (editor mode) | ✅ | PharmacyBlogPage `ViewMode='editor'` |
| 임시저장 (draft) | ✅ | `handleSave()` (line 137-163) |
| 발행 (publish) | ✅ | `handlePublish()` (line 165-173) |
| 발행취소/보관 (archive) | ✅ | API `PATCH /staff/:id/archive` |
| 미리보기 | ❌ 코드 부재 | grep 미검출 |
| 공개 URL 복사 | ❌ 코드 부재 | grep 미검출 |
| Blog 설정 화면 (이름/설명/테마) | ❌ 코드 부재 | grep 미검출 |
| 카테고리/태그 | ❌ 코드 부재 | entity에 컬럼 없음 |
| SEO meta(title/og:image) | ❌ 코드 부재 | Helmet 미사용 |
| 스케줄 발행 | ❌ 코드 부재 | publishedAt manual setter만 |

**판정**: "게시글 관리" 수준이며 "블로그 관리" 수준에 미도달.

### 1.3 콘텐츠 제작 흐름

```
내 자료함 → 제작 시작 → "블로그" 선택
   → location.state.production.source.items 전달
   → /store/content/blog (PharmacyBlogPage)
   → editor 모드 진입, items[0].title/description 로 plain prefill
   → 저장(draft) 또는 발행(published)
```

[PharmacyBlogPage.tsx:99-118](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx#L99) 에서 production state 수신.

**AI 변환**:
- AI 프롬프트 자체는 [apps/api-server/src/services/ai-prompts/blog.ts](apps/api-server/src/services/ai-prompts/blog.ts) 에 존재 (HTML 변환용)
- 그러나 **PharmacyBlogPage editor에서 AI 호출 코드 없음** — plain `description` 텍스트만 prefill
- 즉 백엔드 prompt는 정의됐지만 클라이언트에서 미연동 (transitional)

---

## 2. 공개 URL 구조

### 2.1 현재
- 매장 종속: `/store/{storeSlug}/blog`, `/store/{storeSlug}/blog/{postSlug}`
- **storeSlug 단독 — 별도 blog slug 없음**
- alias / vanity URL 없음
- API: `/api/v1/stores/:slug/blog` (unified-store-public.routes.ts) 또는 `/api/v1/{service}/stores/:slug/blog/*`

### 2.2 SEO/meta
- ❌ `<title>`, `<meta name="description">`, `<meta property="og:*">` 처리 코드 부재
- React Helmet 미사용
- 게시글 본문 렌더링: `whiteSpace: 'pre-wrap'` ([StoreBlogPostPage.tsx:91](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx#L91)) — HTML 미파싱
- **검색엔진 친화도 매우 낮음**

### 2.3 변경 가능성
storeSlug 종속 URL은 backend `StoreSlugService` + frontend route 모두 storeSlug 기반이므로 변경 비용 큼. 그러나 alias 추가(예: `/blog/:customSlug → /store/:storeSlug/blog`)는 가능.

---

## 3. Entity / API 구조

### 3.1 핵심 entity

| 개념 | 테이블 | 위치 | 상태 |
|------|--------|------|------|
| 게시글 | `store_blog_posts` | [apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts) | ✅ 존재 |
| Blog 메타 (이름/설명/테마/대표 이미지) | — | — | ❌ **부재** |
| 매장 storefront 설정 | `organizations.storefront_config` (JSONB) | [organization-store.entity.ts:86-92](apps/api-server/src/modules/store-core/entities/organization-store.entity.ts#L86) | ✅ 부분 활용 |

`store_blog_posts` 컬럼:
```
id (UUID), storeId (UUID), serviceKey (varchar 50),
title, slug, excerpt, content (text),
status (varchar 20: draft|published|archived),
publishedAt, createdAt, updatedAt
```
인덱스: `[storeId, status]`, `[storeId, slug] UNIQUE`, `[storeId, publishedAt DESC]`
Migration: [1771200000006-CreateStoreBlogPosts.ts](apps/api-server/src/database/migrations/1771200000006-CreateStoreBlogPosts.ts).

**Boundary**: `storeId + serviceKey` 복합 (CLAUDE.md §7 Boundary Policy 부합).

### 3.2 API 엔드포인트

| Method | Path | 인증 | 위치 |
|--------|------|------|------|
| GET | `/stores/:slug/blog` (목록 — published만) | 무인증 | [blog.controller.ts:86-97](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts#L86) |
| GET | `/stores/:slug/blog/:postSlug` (상세) | 무인증 | controller 내부 |
| GET | `/stores/:slug/blog/staff` (전체 + draft) | requireAuth | controller |
| POST | `/stores/:slug/blog/staff` | requireAuth | controller |
| PUT | `/stores/:slug/blog/staff/:id` | requireAuth | controller |
| PATCH | `/stores/:slug/blog/staff/:id/publish` | requireAuth | controller |
| PATCH | `/stores/:slug/blog/staff/:id/archive` | requireAuth | controller |
| DELETE | `/stores/:slug/blog/staff/:id` | requireAuth | controller |

**Service layer 부재** — 모든 비즈니스 로직 controller inline. `verifyOwner()` (line 67-69)는 `pharmacy.created_by_user_id === userId` 검증.

### 3.3 자료함 ↔ Blog 연결
- `store_blog_posts`는 `library_item_id` FK 없음
- 본문 `content`는 request body에서 직접 수신 (자료 복제도 참조도 없음)
- 즉 **Blog post와 자료함 항목 간 영구 연결 부재** — 자료함 → 제작 시작 → blog는 단순 prefill 흐름

---

## 4. Blog 메타 / 설정 구조

| 항목 | 현재 저장 위치 | 비고 |
|------|---------------|------|
| 블로그 이름 | ❌ — 매장명 fallback | 코드상 grep 미검출 |
| 설명 | ❌ | — |
| 대표 이미지 | ❌ | — |
| 공개 여부 | ❌ — 항상 공개 | post.status로 글 단위만 |
| 템플릿 | ❌ | entity field 없음 |
| 소개 문구 | ❌ | — |
| 대표 콘텐츠 | ❌ | — |
| 카테고리 | ❌ | — |
| theme/color | ❌ — `colors` 상수 hardcoded | [styles/theme.ts](services/web-kpa-society/src/styles/theme.ts) |

**저장 가능 채널** (만약 추가한다면):
- 옵션 1: `OrganizationStore.storefront_config` JSONB에 `blog: { name, description, image, theme }` 추가 (entity 신설 없음)
- 옵션 2: 신규 `store_blog_settings` 테이블 (storeId UNIQUE) — 명시적·인덱싱 우수
- 옵션 3: `store_blog_posts`에 일부 흡수 — 비추천 (메타와 글 분리 필요)

---

## 5. Store ↔ Blog 관계

### 5.1 매장 사이트(StorefrontHomePage)와의 관계

[StorefrontHomePage.tsx](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx) 는 매장의 **공개 미니 사이트**:
- 라우트: `/store/:slug` ([App.tsx:897](services/web-kpa-society/src/App.tsx#L897))
- 블록 시스템 기반 (`StoreBlockRegistry`)
- `BLOG_LIST` 블록 활성화 시 최신 게시글 미리보기 노출 ([line 179-187](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx#L179))
- `fetchJson('/api/v1/stores/:slug/blog?limit=...')` 로 데이터 로드

`BlogListBlock` ([packages/ui/src/store-blocks/blocks/blog-list.block.tsx](packages/ui/src/store-blocks/blocks/blog-list.block.tsx)) 은 공통 패키지 컴포넌트로, "전체보기" 링크가 `/store/:slug/blog` 진입.

**즉 현재 구조 자체가 이미**:
```
매장 미니 사이트 (StorefrontHomePage, /store/:slug)
   ├── 매장 정보 블록
   ├── 상품 블록
   ├── BLOG_LIST 블록 ← Blog는 매장 사이트의 "한 섹션"
   └── ... 기타 블록
```
**Blog는 매장 사이트의 콘텐츠 채널이지, 매장 사이트 자체가 아니다.**

### 5.2 진입점

| From | 경로 |
|------|------|
| 매장 홈 카드 | [StoreHomePage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx) "실행 흐름" Step 2 → `/store/marketing/pop` 등 |
| 사이드바 | `매장 실행 → 블로그` ([storeMenuConfig.ts](packages/store-ui-core/src/config/storeMenuConfig.ts)) |
| 자료함 | 자료 선택 → 제작 시작 → 블로그 |
| 매장 공개 사이트 | StorefrontHomePage `BLOG_LIST` 블록 → `/store/:slug/blog` |

### 5.3 Blog가 매장 정보를 표시하나
**아니오.** [StoreBlogPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx)·[StoreBlogPostPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx) 모두 매장명/로고/소개 등 매장 정보 노출 없음. 게시글 데이터만 표시.

---

## 6. 템플릿 / 테마 구조

### 6.1 현재
- **단일 layout 단일 theme** (코드상 분기 없음)
- entity/migration에 `template`, `theme`, `layout`, `style`, `color` 필드 부재
- Blog 페이지 전체가 `colors` 상수(hardcoded) + 인라인 스타일
- StartProductionModal 주석에서 명시: **"템플릿 선택 단계 제거"** ([StartProductionModal.tsx:5-13](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx#L5)) — 과거에 mock으로 있었으나 정리

### 6.2 prototype
- [BlogTemplates.tsx](services/web-kpa-society/src/pages/pharmacy/BlogTemplates.tsx)에 4개 컴포넌트 (Modern, Emotional, Dry, Professional) 정의됨
- 그러나 **실제 데이터 렌더링과 단절** — preview UI prototype에 가까움
- `pharmacyName` prop은 preview 전용

### 6.3 다중 템플릿 도입 시 진입점

| 레이어 | 위치 | 작업 |
|--------|------|------|
| DB | `store_blog_posts` 또는 `store_blog_settings` | `template: varchar` 컬럼 + migration |
| API | [blog.controller.ts:86-97](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts#L86) | select 절·request body에 template 추가 |
| 공개 컴포넌트 | StoreBlogPage / StoreBlogPostPage | switch(template) → BlogTemplates 컴포넌트 호출 |
| 관리 UI | PharmacyBlogPage editor | template selector 추가 |

확장 후보 카테고리(매장형/뉴스형/카드형/영상형/제품홍보형/건강정보형)는 모두 **데이터 모델에 `template` 컬럼 1개만 추가하면 분기 가능** — 현재 구조 변경 없이 진입.

---

## 7. 다른 서비스 공통화 가능성

### 7.1 현 상태

| 서비스 | Blog 코드 | 비고 |
|--------|-----------|------|
| **KPA** | ✅ 활성 (PharmacyBlogPage, StoreBlogPage, StoreBlogPostPage) | 본 IR 대상 |
| **Neture** | ✅ 존재 ([StoreBlogListPage.tsx](services/web-neture/src/pages/store/StoreBlogListPage.tsx), [StoreBlogPage.tsx](services/web-neture/src/pages/store/StoreBlogPage.tsx)) | 동일 unified API 사용 |
| **GlycoPharm** | ❌ 코드 부재 | — |
| **K-Cosmetics** | ❌ 코드 부재 | — |

### 7.2 공통 패키지

| 패키지 | Blog 자산 |
|--------|-----------|
| `packages/ui/src/store-blocks/blocks/blog-list.block.tsx` | ✅ 공유 BlogListBlock 존재 |
| `packages/store-ui-core` | ❌ Blog 전용 컴포넌트 없음 |
| `packages/shared-space-ui` | ❌ Blog 전용 컴포넌트 없음 |
| `packages/blog-core` | ❌ **부재** (Forum-core와 비교됨) |

### 7.3 공통 layer 승격 가능성
- Backend entity/controller가 이미 **`storeId + serviceKey` 매개변수화** ([blog.controller.ts:49-52](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts#L49) — `createBlogController(dataSource, requireAuth, serviceKey)`)
- Forum-core ([packages/forum-core](packages/forum-core/)) 패턴(공통 entity + 서비스별 metadata + serviceKey 분기)을 **그대로 적용 가능**
- 즉 **공통 layer 승격은 기술적으로 자연스러운 다음 단계**

### 7.4 O4O 철학(CLAUDE.md §13) 정합성
> "forum, lms, signage는 서비스별 기능이 아니라 플랫폼 공통 구조"

Blog도 같은 카테고리에 속할 후보. 단:
- Forum/LMS/Signage는 "여러 서비스가 동일 구조를 공유"하는 명시적 공통 자산
- Blog는 현재 KPA + Neture 2개 서비스만 active — 공통 layer 정당성은 충분하지만, GlycoPharm/K-Cosmetics 도입 시 진가 발휘
- **현 시점 승격 시점은 적절** (서비스 추가 전 미리 정렬하면 비용↓)

---

## 8. 구조 판정 (A/B/C/D)

| 옵션 | 정의 | 현재 부합도 | 판정 |
|------|------|:----------:|------|
| **A. 단순 게시판** | 게시글 CRUD만, 매장 무관 | ★★★★ | 데이터 모델 본질이 여기에 가까움 |
| **B. 콘텐츠 채널** | storeId + serviceKey로 매장별 채널 분리, 멀티테넌트 | ★★★★ | 코드 구조는 이미 채널 모델 |
| **C. 매장 홍보 블로그** | 매장 정보·테마·카테고리·SEO 갖춘 매장 마케팅 채널 | ★★ | 메타·테마·SEO 부재 → 진화 후보 |
| **D. 매장 미니 사이트** | 매장 자체를 표현하는 다중 페이지 사이트 | ★ | **이미 StorefrontHomePage가 담당** — Blog로 흡수 시 중복 |

### 결론
- **현 위치**: A → B 사이 (게시판 데이터 모델이지만 채널 분리 설계)
- **추천 정렬**: **B + C 강화** — Blog 메타(이름/설명/대표 이미지/테마) + 카테고리 + SEO meta + 다중 template
- **D는 비추천**: StorefrontHomePage가 이미 매장 사이트(블록 시스템) 역할. Blog는 그 안의 한 채널로 명확히 정렬해야 책임 중복 회피.
- **과도 확장 위험**: D 추구 시 StorefrontHomePage와 entity·라우트·블록 시스템이 충돌. 실제 매장 사용자에게 두 사이트가 보이는 모순 발생 가능.

### O4O 철학 정합성
- ✅ §13 공통 구조 원칙 — Blog를 공통 layer로 승격 후보
- ✅ §7 Boundary Policy — `storeId + serviceKey` 복합 boundary 이미 적용
- ✅ §11 Operator Dashboard 표준 — 관리 페이지(`/store/content/blog`) 분리, 공개 라우트 별도
- ⚠ Design Core(§9 / §12) 미적용 — Blog 페이지가 hardcoded `colors` 상수 사용

---

## 9. 추천 방향

### 단기 (현 KPA 기능 polish)
1. **공개 URL 복사** + **미리보기** 버튼 추가 (PharmacyBlogPage)
2. **SEO meta** (Helmet 또는 server-side title/og 태그)
3. **카테고리/태그** entity + UI (검색·필터)
4. **공개 페이지에 매장 정보 헤더 추가** (매장명·로고) — Blog가 매장 채널임을 명시
5. **AI 변환 연결** — 백엔드 prompt가 이미 존재하므로 PharmacyBlogPage editor에 "AI로 다듬기" 버튼 추가

### 중기 (Blog 메타 & 다중 템플릿)
6. `store_blog_settings` entity 신설 (storeId UNIQUE) — 이름·설명·대표 이미지·기본 template
7. `store_blog_posts.template` 컬럼 추가 + BlogTemplates.tsx 4종 연동
8. StorefrontHomePage `BLOG_LIST` 블록 ↔ Blog 메타 연동 (블록 표시명 = blog meta name)

### 장기 (공통 layer 승격)
9. `packages/blog-core` 신설 (Forum-core 패턴) — entity / controller / API client / 공통 컴포넌트
10. GlycoPharm·K-Cosmetics에 Blog 도입 (config만으로 활성화)
11. 매장 사이트(StorefrontHomePage)와 Blog의 책임 경계 명문화 (architecture doc)

### 비추천
- Blog 자체를 매장 사이트로 부풀리기(D) — StorefrontHomePage 중복
- Blog 자체에 상품/주문/카운터 통합 — Commerce/Boundary Policy 위반 위험

---

## 10. 다음 WO 초안

### (단기 1) WO-O4O-KPA-STORE-BLOG-PUBLISHING-UX-V1
**범위**: PharmacyBlogPage에 미리보기·공개 URL 복사 + StoreBlogPostPage에 SEO meta(Helmet) 적용
**비포함**: 신규 entity, AI 연동, 다중 template
**예상 diff**: < 150 lines, 신규 entity/migration 없음

### (단기 2) WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1
**범위**: StoreBlogPage / StoreBlogPostPage에 매장 정보 헤더(매장명·로고) 추가 — Blog가 매장 채널임을 시각화. 데이터는 unified-store-public API에서 추가 조회.
**예상 diff**: < 80 lines

### (중기) WO-O4O-KPA-STORE-BLOG-META-V1
**범위**: `store_blog_settings` entity (storeId UNIQUE) + 관리 화면(블로그 이름·설명·대표 이미지·기본 template) + StorefrontHomePage BLOG_LIST 블록 연동
**필요**: 신규 entity + migration (사용자 승인 필요)
**예상 diff**: ~300 lines

### (중기) WO-O4O-KPA-STORE-BLOG-TEMPLATE-V1
**범위**: `store_blog_posts.template` 컬럼 추가 + BlogTemplates.tsx 실제 연동 + editor에 template selector
**필요**: migration (단일 컬럼 추가)
**예상 diff**: ~200 lines

### (장기) WO-O4O-PLATFORM-BLOG-CORE-EXTRACTION-V1
**범위**: KPA + Neture에서 검증된 Blog entity/controller/API client를 `packages/blog-core`로 이전. Forum-core 패턴 차용.
**비포함**: 새 기능 추가 — 공통 layer 승격 only
**예상 diff**: 큼 (file move 다수). 별도 설계 필요.

---

## 11. 검증 매트릭스 (현재 상태)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| Blog 관리 페이지 진입 (`/store/content/blog`) | ✅ | App.tsx:886 |
| 게시글 목록/draft/published 분리 | ✅ | PharmacyBlogPage:280-298 |
| 공개 라우트 `/store/:slug/blog` | ✅ | App.tsx:906 |
| 공개 라우트 `/store/:slug/blog/:postSlug` | ✅ | App.tsx:907 |
| StorefrontHomePage BLOG_LIST 블록 연동 | ✅ | StorefrontHomePage:179-187 |
| Neture 동일 entity 재사용 | ✅ | unified-store-public.routes.ts |
| Blog 메타 (이름/설명/테마) | ❌ | entity 부재 |
| 카테고리/태그 | ❌ | entity 부재 |
| 다중 템플릿 | ❌ | template 컬럼 부재 |
| 미리보기 / 공개 URL 복사 | ❌ | grep 미검출 |
| SEO meta(Helmet) | ❌ | grep 미검출 |
| AI 변환 (UI 연동) | ❌ | controller에서 미호출 |
| Service layer 분리 | ❌ | controller inline only |
| 공통 패키지(blog-core) | ❌ | 부재 |

---

## Appendix: 핵심 파일 인덱스

| 영역 | 파일 |
|------|------|
| 관리 페이지 | [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) |
| 공개 — 목록 | [services/web-kpa-society/src/pages/store/StoreBlogPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx) |
| 공개 — 상세 | [services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx) |
| 매장 미니 사이트 | [services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx) |
| BlogList 블록 (공통) | [packages/ui/src/store-blocks/blocks/blog-list.block.tsx](packages/ui/src/store-blocks/blocks/blog-list.block.tsx) |
| 템플릿 prototype | [services/web-kpa-society/src/pages/pharmacy/BlogTemplates.tsx](services/web-kpa-society/src/pages/pharmacy/BlogTemplates.tsx) |
| 진입 모달 | [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) |
| Entity | [apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts) |
| Migration | [apps/api-server/src/database/migrations/1771200000006-CreateStoreBlogPosts.ts](apps/api-server/src/database/migrations/1771200000006-CreateStoreBlogPosts.ts) |
| Controller | [apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts) |
| AI Prompt (미연동) | [apps/api-server/src/services/ai-prompts/blog.ts](apps/api-server/src/services/ai-prompts/blog.ts) |
| Unified Public API | [apps/api-server/src/routes/platform/unified-store-public.routes.ts](apps/api-server/src/routes/platform/unified-store-public.routes.ts) |
| OrganizationStore | [apps/api-server/src/modules/store-core/entities/organization-store.entity.ts](apps/api-server/src/modules/store-core/entities/organization-store.entity.ts) |
| Neture Blog (참고) | [services/web-neture/src/pages/store/StoreBlogListPage.tsx](services/web-neture/src/pages/store/StoreBlogListPage.tsx), [services/web-neture/src/pages/store/StoreBlogPage.tsx](services/web-neture/src/pages/store/StoreBlogPage.tsx) |
| Forum-core (공통화 패턴 참고) | [packages/forum-core/](packages/forum-core/) |

---

*조사 마감: 2026-05-09*
*상태: 조사 완료, 정렬 방향 결정 대기*
