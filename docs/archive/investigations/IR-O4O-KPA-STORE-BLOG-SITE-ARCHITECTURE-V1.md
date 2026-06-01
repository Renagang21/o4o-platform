# IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1

**조사 일자**: 2026-05-09 (Refreshed)
**조사 기준**: main, 직전 sync (`Already up to date`)
**조사 범위**: KPA 매장 Blog — 관리/공개 페이지·entity/API·템플릿·매장 관계·다른 서비스 공통화 가능성
**조사자**: Claude Opus 4.7 — 정적 분석, 코드 수정 없음
**Note**: 같은 ID(V1)의 1차 조사가 동일 일자 오전에 수행됐으나, 그 이후 9개의 Blog 관련 WO가 머지되어 사실상 본 문서가 최신 상태(refresh)이다. V1 → 본 refresh 사이의 변화는 **§1 V1 대비 주요 변화**에 정리.

---

## 0. 핵심 결론 (TL;DR)

> **현재 Blog는 V1 시점("단순 게시판 A")에서 "콘텐츠 채널 B + 매장 홍보 블로그 C" 영역으로 본격적으로 진화했다. 매장 Identity 헤더·SEO·다중 템플릿·AI Wiring·RichText·메타 entity가 모두 적용 완료되었으며, KPA + GlycoPharm 두 서비스에서 동일한 shared-space-ui 자산을 재사용 중이다.**

> **반면 packages/blog-core 정식 패키지(forum-core 패턴)는 여전히 부재이며, 카테고리/태그/댓글/예약 발행 같은 "블로그 운영 도구" 영역은 미진하다. "매장 미니 사이트(D)" 방향은 여전히 비추천 (StorefrontHomePage가 그 역할).**

판정: **B + C 정착, 다음 단계는 ① 운영 기능 보강 ② backend factory의 패키지 승격**.

핵심 사실:
1. **Blog 메타 entity 도입 완료** — `store_blog_settings`(storeId UNIQUE) 신설. blogName / description / heroImage / defaultTemplate.
2. **템플릿 2종(Professional / Modern) 활성** — packages/shared-space-ui/src/blog/blogTemplates.tsx, query `?template=` override + settings.defaultTemplate fallback.
3. **SEO 메타 적용 완료** — `useBlogSeo` 훅 (Helmet 미사용, document.title + meta 직접 조작). title / description / og:title / og:description / og:image / og:url 동기화.
4. **매장 Identity 헤더 적용 완료** — `BlogPublicHeader` (로고·매장명·소개·heroImage·"매장 메인으로" navigation). compact 옵션 제공.
5. **AI Wiring 활성** — AiContentModal + /api/ai/content 프록시(Gemini). content/title/excerpt 자동 채움(미입력 시만), 본문 항상 replace, 자동 발행 없음.
6. **RichText 본문 적용 완료** — TipTap 기반 RichTextEditor(@o4o/content-editor), HTML 저장, sanitize 처리, plain text 역호환.
7. **Backend factory 패턴** — `createBlogController(dataSource, requireAuth, serviceKey)`. KPA('kpa') / GlycoPharm(default 'glycopharm') 등록.
8. **Cross-service 변화**: KPA + GlycoPharm 활성, **Neture RETIRE 완료** (UI/route 제거, entity 공유 유지), K-Cosmetics 미도입.
9. **shared-space-ui 추출 완료** — BlogPublicHeader / blogTemplates / useBlogSeo / client.ts 4개 자산. KPA·GlycoPharm 100% 재사용.
10. **packages/blog-core 정식 패키지는 미존재** — Forum-core 패턴(라이프사이클 / manifest / lifecycle hooks / admin-ui 통합)은 적용 안 됨.

---

## 1. V1 대비 주요 변화

직전 9개 WO 머지로 V1 시점에 ❌였던 다수 항목이 ✅로 전환됐다.

| 항목 | V1 (오전) | 현재 (refresh) | 관련 WO |
|---|:---:|:---:|---|
| 매장 Identity 헤더 (매장명/로고/heroImage 노출) | ❌ | ✅ | WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1 |
| SEO meta(title / og:* / description) | ❌ | ✅ | (동일 WO + UI-PARTIAL-EXTRACT) |
| 다중 템플릿 (Professional / Modern) | ❌ (prototype만) | ✅ (활성, 2종) | WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1 |
| Blog 메타 entity (`store_blog_settings`) | ❌ | ✅ | WO-O4O-KPA-STORE-BLOG-META-V1 |
| RichText 본문 (HTML, sanitize) | ❌ (plain text) | ✅ | WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1 |
| AI Wiring 클라이언트 연결 | ❌ (prompt만 백엔드 정의) | ✅ (AiContentModal + /api/ai/content) | WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1 |
| 미리보기 버튼 | ❌ | ✅ (window.open) | (PUBLIC-HEADER WO 묶음) |
| 공개 URL 복사 버튼 | ❌ | ✅ (clipboard) | (동일) |
| Blog 설정 화면 (이름/설명/heroImage/template) | ❌ | ✅ (별도 'settings' 모드) | WO-O4O-KPA-STORE-BLOG-META-V1 |
| GlycoPharm Blog 도입 | ❌ (코드 부재) | ✅ (KPA canonical 100% 재사용) | WO-O4O-GLYCO-BLOG-INTRODUCE-V1 |
| Neture Blog 정렬/제거 | △ (활성, 부분 정렬) | ❌ → 의도적 제거 | WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1 → WO-O4O-NETURE-BLOG-RETIRE-V1 |
| shared-space-ui Blog 자산 추출 | ❌ (없음) | ✅ (4개 자산) | WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1 |
| 자료함 → 제작 시작 → Blog 흐름 | △ (단순 prefill) | ✅ (canonical 단일 진입) | WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS, WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION |
| `packages/blog-core` 정식 패키지 | ❌ | ❌ (여전히 부재, shared-space-ui로 부분 대체) | — |
| 카테고리 / 태그 | ❌ | ❌ (여전히 부재) | — |
| 댓글 / 반응 | ❌ | ❌ (여전히 부재) | — |
| 예약 발행 / 자동 저장 | ❌ | ❌ (여전히 부재) | — |
| 본문 영구 연결 (library_item_id FK) | ❌ | ❌ (여전히 부재 — prefill만) | — |
| aiContext 저장 (AI 호출 컨텍스트 보존) | ❌ | ❌ (여전히 부재) | — |

---

## 2. 현재 Blog 구조 요약

### 2.1 페이지·라우트

| 영역 | 컴포넌트 | 라우트 | 인증 |
|---|---|---|---|
| 관리 (operator) | [PharmacyBlogPage](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) | `/store/content/blog` | requireAuth |
| 공개 — 목록 | [StoreBlogPage](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx) | `/store/:storeSlug/blog` ([App.tsx:905](services/web-kpa-society/src/App.tsx#L905)) | 무인증 |
| 공개 — 상세 | [StoreBlogPostPage](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx) | `/store/:storeSlug/blog/:postSlug` ([App.tsx:907](services/web-kpa-society/src/App.tsx#L907)) | 무인증 |
| Legacy redirect | KpaRedirect | `/kpa/store/:slug/blog[/:postSlug]` → 위 라우트 | — |

GlycoPharm도 **동일 경로 구조**(`/store/:slug/blog`)로 운영하며, slug → serviceKey 해석은 `StoreSlugService` + `unified-store-public.routes.ts`가 담당.

### 2.2 관리 UX (refresh)

| 기능 | 상태 | 위치 |
|---|:---:|---|
| 게시글 목록 / 상태 필터(전체/draft/published/archived) | ✅ | PharmacyBlogPage.tsx:608 |
| 게시글 작성 (editor mode) | ✅ | :159-174 |
| 임시저장 (draft) | ✅ | :176 |
| 발행 (publish) | ✅ | :204 — `PATCH /staff/:id/publish` |
| 보관 (archive) | ✅ | :214 |
| 삭제 | ✅ | :224 (확인 모달 포함) |
| **미리보기** | ✅ NEW | :255 — `window.open(공개 URL, '_blank')` |
| **공개 URL 복사** | ✅ NEW | :240 — clipboard + alert |
| **Blog 설정 화면** (별도 'settings' 모드) | ✅ NEW | :458-604 |
| 설정: blogName / description | ✅ NEW | :479, :489 |
| 설정: heroImage (URL + 파일 업로드) | ✅ NEW | :499-533 (`mediaApi.upload`) |
| 설정: defaultTemplate (radio: professional / modern) | ✅ NEW | :536-568 |
| **AI 콘텐츠 보조** | ✅ NEW | :387-451 (AiContentModal) |
| AI trigger 위치 | ✅ NEW | :399 "AI로 정리하기" 버튼 |
| 카테고리 / 태그 | ❌ | entity·UI 모두 부재 |
| 예약 발행(scheduled publish) | ❌ | `published_at` manual setter만 |
| 자동 저장(autosave) | ❌ | RichTextEditor `interval=0` |
| 게시글별 template selector(post 단위) | ❌ | settings의 `defaultTemplate`만 저장, post별 column 없음 |
| 본문 영구 라이브러리 연결 | ❌ | `library_item_id` FK 없음 |

**판정**: V1의 "게시글 관리 수준" → 현재 **"기본 블로그 운영 수준"** 도달. 운영 보강 영역(카테고리/예약/댓글)이 다음 단계.

---

## 3. 공개 URL 구조 / SEO

### 3.1 URL
- 공개: `/store/:storeSlug/blog`, `/store/:storeSlug/blog/:postSlug`
- alias / vanity URL 미지원
- StoreSlugService 통합 — slug history 지원, slug 변경 시 redirect 가능
- API base: `/api/v1/stores/:slug/blog*` (unified) + 서비스별 `/api/v1/{service}/stores/...`

### 3.2 SEO (V1 ❌ → 현재 ✅)
- 훅: [`packages/shared-space-ui/src/blog/useBlogSeo.ts`](packages/shared-space-ui/src/blog/useBlogSeo.ts)
  - `document.title` + `meta[name="description"]` + `meta[property="og:title|og:description|og:image|og:url|og:type=article"]` 직접 조작
  - **Helmet 미사용** (imperative `useEffect`) — SSR 미대응
  - Twitter card / `<link rel="canonical">` 미포함 (og:url로 대체)
- StoreBlogPage 사용 ([:68-73](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx#L68))
  - title: `${blogName} 칼럼` 또는 `Column`
  - ogImage: `blogSettings?.heroImage || storeInfo?.hero_image || storeInfo?.logo`
- StoreBlogPostPage 사용 ([:74-79](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx#L74))
  - title: `${post.title} | ${blogName}`
  - description: `excerpt → content` fallback, 160자 truncate

### 3.3 변경 가능성
- 별도 blog slug / vanity URL 도입 가능하지만 현재 명확한 요구는 없음
- SSR 도입 시 Helmet 또는 React 18 metadata API 전환 필요 (지금은 CSR 한정)

---

## 4. Entity / API

### 4.1 Entity 현재

#### `store_blog_posts`
| 컬럼 | 타입 | nullable | 비고 |
|---|---|:---:|---|
| id | uuid | NO | PK |
| store_id | uuid | NO | 매장 |
| service_key | varchar(50) | NO | `kpa` / `glycopharm` |
| title | varchar(255) | NO | |
| slug | varchar(150) | NO | (storeId, slug) UNIQUE |
| excerpt | text | YES | |
| content | text | NO | **Rich HTML** |
| status | varchar(20) | NO | `draft` / `published` / `archived` |
| published_at | timestamptz | YES | |
| created_at / updated_at | timestamptz | NO | |

인덱스: `(store_id, status)`, `(store_id, slug) UNIQUE`, `(store_id, published_at DESC)`
Migration: [1771200000006-CreateStoreBlogPosts.ts](apps/api-server/src/database/migrations/1771200000006-CreateStoreBlogPosts.ts)
**Boundary**: `storeId + serviceKey` 복합 (CLAUDE.md §7 부합)

> V1 시점 대비 컬럼 추가 없음 — `template` / `aiContext` / `library_item_id` 모두 미실장.

#### `store_blog_settings` (NEW — META WO)
| 컬럼 | 타입 | nullable | 비고 |
|---|---|:---:|---|
| id | uuid | NO | PK |
| store_id | uuid | NO | UNIQUE (1매장 1settings) |
| service_key | varchar(50) | NO | 인덱싱 |
| blog_name | varchar(200) | YES | 미설정 시 store name fallback |
| description | text | YES | |
| hero_image | varchar(500) | YES | URL |
| default_template | varchar(50) | NO | default `'professional'` |
| created_at / updated_at | timestamptz | NO | |

Entity: [apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts)
Migration: [20260918000000-CreateStoreBlogSettings.ts](apps/api-server/src/database/migrations/20260918000000-CreateStoreBlogSettings.ts)

### 4.2 API 엔드포인트 (refresh)

| Method | Path | 인증 | 동작 | 위치 |
|---|---|:---:|---|---|
| GET | /stores/:slug/blog | ❌ | published 목록 (공개) | blog.controller.ts:89 |
| GET | /stores/:slug/blog/:postSlug | ❌ | 상세 (공개) | :498 |
| **GET** | **/stores/:slug/blog/settings** | ❌ | **공개 메타 (blogName/heroImage/defaultTemplate)** | **:478** |
| GET | /stores/:slug/blog/staff | ✅ | draft 포함 (소유자) | :129 |
| POST | /stores/:slug/blog/staff | ✅ | 생성 | :175 |
| PUT | /stores/:slug/blog/staff/:id | ✅ | 수정 | :228 |
| PATCH | /stores/:slug/blog/staff/:id/publish | ✅ | 발행 | :277 |
| PATCH | /stores/:slug/blog/staff/:id/archive | ✅ | 보관 | :318 |
| DELETE | /stores/:slug/blog/staff/:id | ✅ | 삭제 | :441 |
| **GET** | **/stores/:slug/blog/staff/settings** | ✅ | **운영자 settings 조회** | **:358** |
| **PUT** | **/stores/:slug/blog/staff/settings** | ✅ | **settings upsert** | **:387** |

Controller: [apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts)
Public unified handler: [apps/api-server/src/routes/platform/store-public-content.handler.ts](apps/api-server/src/routes/platform/store-public-content.handler.ts)

### 4.3 자료함 ↔ Blog 연결
- **여전히 영구 연결 부재**. `store_blog_posts`에 `library_item_id` 같은 FK 없음.
- 자료함 → 제작 시작 → Blog는 **단순 prefill 흐름** (StartProductionModal → location.state → editor field 설정).
- 자료함의 콘텐츠와 게시글은 한 번 분리되면 추적 불가 (이력 / 동기화 / 갱신 모두 없음)

---

## 5. Blog 메타 / 설정 구조 (V1 ❌ → 현재 ✅)

| 항목 | 저장 위치 | 비고 |
|---|---|---|
| 블로그 이름 | `store_blog_settings.blog_name` | 매장명 fallback |
| 설명 | `store_blog_settings.description` | nullable |
| 대표 이미지 | `store_blog_settings.hero_image` | URL, mediaApi 업로드 지원 |
| 기본 템플릿 | `store_blog_settings.default_template` | `professional` / `modern` |
| 게시글별 템플릿 | (post 컬럼 부재) | `?template=` query로만 override 가능 |
| 카테고리 | ❌ | 미실장 |
| 태그 | ❌ | 미실장 |
| 소개 문구 / 대표 콘텐츠 | ❌ | settings 컬럼 추가 필요 |
| theme/color | ❌ | 페이지 inline 스타일, theme 변수 미연동 |

**Blog 설정 화면**: PharmacyBlogPage `mode='settings'` ([:458-604](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx#L458)). 별도 탭이 아닌 mode 전환 방식.

---

## 6. Store ↔ Blog 관계

### 6.1 매장 사이트 (StorefrontHomePage) 와의 관계
- 라우트: `/store/:slug` (블록 시스템 기반 매장 미니 사이트)
- `BLOG_LIST` 블록 활성 시 [StorefrontHomePage:179-187](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx#L179)에서 `/api/v1/stores/:slug/blog?limit=3` 호출
- BlogListBlock([packages/ui/src/store-blocks/blocks/blog-list.block.tsx](packages/ui/src/store-blocks/blocks/blog-list.block.tsx))이 "전체보기" 링크 → `/store/:slug/blog`

```
매장 미니 사이트 (StorefrontHomePage, /store/:slug)
   ├── 매장 정보 블록
   ├── 상품 블록
   ├── BLOG_LIST 블록 ← Blog는 매장 사이트의 "한 섹션"
   └── ... 기타 블록
```

### 6.2 양방향 navigation (V1 ❌ → 현재 ✅)
- BlogPublicHeader 안의 **"← 매장 메인으로"** 링크 ([BlogPublicHeader:71-81](packages/shared-space-ui/src/blog/BlogPublicHeader.tsx#L71)) — 12px 절제된 하이퍼링크
- StorefrontHomePage BLOG_LIST의 "전체보기" 버튼

→ **Blog ↔ 매장 메인 navigation이 양방향으로 명확**해짐.

### 6.3 Blog 페이지가 매장 정보를 표시하나
- ✅ 표시함. BlogPublicHeader가 매장명 / 로고 / 설명 / heroImage 노출
- compact 모드(상세 페이지) — 로고만 축소(40px), 설명/이미지 숨김
- 데이터 source: `fetchPublicBlogSettings(slug)` 우선 → `fetchPublicStoreInfo(slug)` fallback

---

## 7. 템플릿 / 테마 구조 (V1 ❌ → 현재 ✅)

### 7.1 활성 템플릿
- 위치: [packages/shared-space-ui/src/blog/blogTemplates.tsx](packages/shared-space-ui/src/blog/blogTemplates.tsx)
- 종류:
  - `professional`: 세로 리스트(날짜-제목-excerpt) + 대형 제목 + 인용 서식 excerpt
  - `modern`: 카드 그리드(호버) + 대형 제목 + 날짜 라벨 + excerpt
- 렌더링 dispatcher: `BlogList` (LIST_TEMPLATES 매핑) / `BlogPostTemplate` (POST_TEMPLATES 매핑)

### 7.2 선택 우선순위
1. URL `?template=` query param (강제 override)
2. `blogSettings.defaultTemplate` (운영자 저장값)
3. `'professional'` (fallback)

### 7.3 본문 렌더링 (`BlogContentBody`)
- HTML 감지 정규식: `<\/?(?:p|h[1-6]|ul|ol|...)\b[^>]*>`
- HTML → `ContentRenderer` (sanitizeHtml 처리, inline-style 제거) + BlogProseStyle
- Plain text → `whiteSpace: 'pre-wrap'`로 줄바꿈 보존

### 7.4 추가 가능한 템플릿
"매장형 / 뉴스형 / 카드형 / 영상형 / 제품홍보형 / 건강정보형" 같은 카테고리 확장은 **shared-space-ui/blog/blogTemplates.tsx에 컴포넌트 추가만으로 진입 가능**. 다만 게시글별 template 지정이 필요하면 `store_blog_posts.template` 컬럼이 추가되어야 함 (현재 query param으로만 override 가능).

---

## 8. 다른 서비스 공통화 가능성 (refresh)

### 8.1 서비스별 현황

| 서비스 | 관리 페이지 | 공개 페이지 | API factory | 상태 |
|---|---|---|---|---|
| **KPA-Society** | ✅ PharmacyBlogPage | ✅ StoreBlogPage / StoreBlogPostPage | `createBlogController(ds, auth, 'kpa')` | 활성 |
| **GlycoPharm** | ✅ PharmacyBlogPage (store-management/) | ✅ StoreBlogPage / Post | `createBlogController(ds, auth)` (default 'glycopharm') | 활성 (canonical 100% 재사용) |
| **Neture** | ❌ 제거 | ❌ 제거 | 미등록 | RETIRE 완료 (entity 공유 유지) |
| **K-Cosmetics** | ❌ 미도입 | ❌ 미도입 | 미등록 | 미구현 |

### 8.2 shared-space-ui Blog 자산 (NEW)

| 자산 | 위치 | 역할 |
|---|---|---|
| `BlogPublicHeader` | packages/shared-space-ui/src/blog/BlogPublicHeader.tsx | 매장 identity 헤더 (logo/name/description/heroImage), compact 모드 |
| `blogTemplates` | packages/shared-space-ui/src/blog/blogTemplates.tsx | Professional / Modern 템플릿 + BlogContentBody + BlogProseStyle |
| `useBlogSeo` | packages/shared-space-ui/src/blog/useBlogSeo.ts | document.title + meta + og:* 동기화 hook |
| `client.ts` | packages/shared-space-ui/src/blog/client.ts | 무인증 public API client (fetchBlogPosts, fetchBlogPost, fetchPublicStoreInfo, fetchPublicBlogSettings) |

→ KPA / GlycoPharm 양쪽 공개 페이지가 100% 동일한 import 구조 — 코드 중복 0.

### 8.3 Backend factory 패턴
- [`createBlogController(dataSource, requireAuth, serviceKey)`](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts) — single factory, serviceKey filter 내장
- 등록 위치:
  - KPA: [apps/api-server/src/routes/kpa/kpa.routes.ts:408](apps/api-server/src/routes/kpa/kpa.routes.ts#L408)
  - GlycoPharm: [apps/api-server/src/routes/glycopharm/glycopharm.routes.ts](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts)
- Public unified: [unified-store-public.routes.ts](apps/api-server/src/routes/platform/unified-store-public.routes.ts) → service-agnostic (slug → storeId 해석 후 entity 직접 쿼리)

### 8.4 packages/blog-core 정식 패키지
- **여전히 부재**. forum-core([packages/forum-core/](packages/forum-core/))처럼 manifest / lifecycle / admin-ui 통합 패키지가 만들어지지 않음.
- 현재는 shared-space-ui(UI 자산) + apps/api-server(controller factory + entity)로 **분산 공통화**.

### 8.5 Forum-core와의 비교

| 영역 | forum-core | 현재 Blog |
|---|---|---|
| npm 패키지 진입점 | ✅ `@o4o/forum-core` | ❌ shared-space-ui로 부분 |
| 라이프사이클(install/activate) | ✅ | ❌ |
| Manifest(deps/permissions/CPT) | ✅ | ❌ |
| Backend entity | forum-core/src/backend/entities/ | apps/api-server/src/routes/glycopharm/entities/ (서비스 종속 위치) |
| Backend service layer | ✅ ForumService 등 | ❌ controller inline |
| Admin UI 모듈 | ✅ admin-ui/ | ❌ 서비스별 page 직접 |
| Public UI 컴포넌트 | ✅ public-ui/ | ✅ shared-space-ui/blog/ (부분) |
| Templates | ✅ templates/ | ✅ shared-space-ui/blog/blogTemplates.tsx |

→ Blog는 **공통화 진행도 ~50%**. UI 계층은 추출됐으나 backend / lifecycle / manifest는 미정리.

### 8.6 공통화 평가
- **승격 가능성**: 중간~높음 (조건부)
- **비용**: 중간 (1~2주). entity 위치 이전 + service layer 분리 + manifest + admin-ui 패키징
- **승격 시점**: K-Cosmetics 도입 전이 적기 (3rd 서비스 추가 비용을 줄일 수 있음)

### 8.7 O4O 철학(CLAUDE.md §13) 정합성
> "forum, lms, signage는 서비스별 기능이 아니라 플랫폼 공통 구조"

Blog도 동일 카테고리 후보. 두 서비스 활성 상태에서 forum-core 패턴으로 승격하면 K-Cosmetics 도입 시 config-only 활성화 가능.

---

## 9. 구조 판정 (A/B/C/D — refresh)

| 옵션 | 정의 | V1 부합도 | 현재 부합도 | 판정 |
|---|---|:---:|:---:|---|
| **A. 단순 게시판** | 게시글 CRUD만, 매장 무관 | ★★★★ | ★★ | 데이터 모델은 여전히 게시판이지만 UX는 벗어남 |
| **B. 콘텐츠 채널** | storeId + serviceKey로 매장별 채널 분리, 멀티테넌트 | ★★★★ | ★★★★★ | **현재 가장 적합** (factory + serviceKey + cross-service) |
| **C. 매장 홍보 블로그** | 매장 정보·테마·카테고리·SEO 갖춘 마케팅 채널 | ★★ | ★★★★ | **B와 함께 정착** (Identity 헤더 + SEO + 템플릿) |
| **D. 매장 미니 사이트** | 매장 자체를 표현하는 다중 페이지 사이트 | ★ | ★ | **여전히 비추천** — StorefrontHomePage가 담당 |

### 결론 (refresh)
- **현 위치**: B + C 정착 단계 진입
- **추천 정렬**: **B + C 운영 기능 보강**(카테고리/태그/예약 발행/댓글) → **packages/blog-core 패키지 승격**
- **D는 여전히 비추천**: StorefrontHomePage 블록 시스템과 책임 중복 회피
- **과도 확장 위험**: D 추구 시 entity·라우트·블록 시스템 충돌

### O4O 철학 정합성
- ✅ §13 공통 구조 — 두 서비스 활성, packages/blog-core 승격 시 명시적 공통 구조
- ✅ §7 Boundary Policy — `storeId + serviceKey` 복합 boundary
- ✅ §11 Operator Dashboard 표준 — 관리(`/store/content/blog`) / 공개(`/store/:slug/blog`) 분리
- ⚠️ §9 / §12 Design Core — Blog 페이지가 inline 스타일 사용 (theme 변수 미연동) — 잔여 작업

---

## 10. 추천 방향 (refresh)

### 단기 (운영 기능 보강 — Phase 1)
1. **카테고리 / 태그** entity + UI (검색·필터·SEO 향상)
2. **예약 발행** (`scheduled_publish_at` 컬럼 + cron / scheduled job)
3. **자동 저장(autosave)** — RichTextEditor `interval` 활성 + 충돌 감지
4. **post 단위 template 지정** — `store_blog_posts.template` 컬럼 + editor selector
5. **aiContext 컬럼** — AI 호출 컨텍스트 보존 (재사용 / 추적 / 분석)

### 중기 (공통화 + 보안 - Phase 2)
6. **packages/blog-core 정식 패키지 승격** — forum-core 패턴 (manifest / lifecycle / admin-ui)
7. **본문 sanitize 강화** — ContentRenderer가 처리하지만 추가 정책 검토 (allowed tags, attribute whitelist)
8. **theme 변수 연동** — Blog 페이지를 StorefrontHomePage와 동일 theme system에 통합

### 장기 (인터랙션 - Phase 3)
9. **댓글 / 반응** — forum-core ForumComment 패턴 차용
10. **블로그 분석** — 조회수 / engagement / 인기 글 추적
11. **K-Cosmetics 도입** — packages/blog-core 승격 후 config-only 활성화

### 비추천
- Blog를 매장 미니 사이트로 부풀리기(D) — StorefrontHomePage 중복
- Blog에 상품 / 주문 / 카운터 통합 — Commerce / Boundary Policy 위반 위험

---

## 11. 다음 WO 후보 (refresh)

### Phase 1 — 운영 기능
- **WO-O4O-KPA-STORE-BLOG-CATEGORY-TAG-V1**
  - 범위: `store_blog_categories` / `store_blog_tags` 신규 entity + post와의 다대다 + 공개 페이지 카테고리 nav + 관리 UI
  - 영향: storefront BLOG_LIST 블록 카테고리 필터 옵션 추가 가능
- **WO-O4O-KPA-STORE-BLOG-SCHEDULE-AUTOSAVE-V1**
  - 범위: `scheduled_publish_at` 컬럼 + scheduled job + autosave interval 활성
- **WO-O4O-KPA-STORE-BLOG-POST-TEMPLATE-COLUMN-V1**
  - 범위: `store_blog_posts.template` 컬럼 + editor template selector + post 단위 우선순위
- **WO-O4O-KPA-STORE-BLOG-AI-CONTEXT-V1**
  - 범위: `store_blog_posts.ai_context` jsonb 컬럼 + AiContentModal 결과 저장 + 재사용 UX

### Phase 2 — 공통화
- **WO-O4O-PLATFORM-BLOG-CORE-PACKAGE-V1**
  - 범위: shared-space-ui 자산 + backend factory + entity를 `packages/blog-core`로 통합
  - manifest / lifecycle / admin-ui 모듈 정의 (forum-core 패턴)
  - KPA / GlycoPharm은 manifest 활성화로 전환
  - **K-Cosmetics 도입 전 진행 권장** — 3rd 서비스 비용 절감
- **WO-O4O-KPA-STORE-BLOG-THEME-INTEGRATION-V1**
  - 범위: Blog 페이지 inline 스타일 → theme CSS 변수 (StorefrontHomePage와 일관성)

### Phase 3 — 인터랙션
- **WO-O4O-PLATFORM-BLOG-COMMENT-V1**
- **WO-O4O-PLATFORM-BLOG-ANALYTICS-V1**
- **WO-O4O-K-COSMETICS-BLOG-INTRODUCE-V1** (Phase 2 의존)

---

## 12. 검증 매트릭스 (refresh)

| 항목 | V1 | 현재 | 근거 |
|---|:---:|:---:|---|
| Blog 관리 페이지 진입 (`/store/content/blog`) | ✅ | ✅ | App.tsx |
| 게시글 목록/draft/published 분리 | ✅ | ✅ | PharmacyBlogPage |
| 공개 라우트 `/store/:slug/blog` | ✅ | ✅ | App.tsx:905 |
| 공개 라우트 `/store/:slug/blog/:postSlug` | ✅ | ✅ | App.tsx:907 |
| StorefrontHomePage BLOG_LIST 블록 연동 | ✅ | ✅ | StorefrontHomePage:179-187 |
| Cross-service 활성 | KPA + Neture | KPA + GlycoPharm | unified routes |
| Neture 활성 | ✅ | ❌ (RETIRE) | WO-O4O-NETURE-BLOG-RETIRE-V1 |
| Blog 메타 entity | ❌ | ✅ | store_blog_settings (META WO) |
| 카테고리/태그 | ❌ | ❌ | 여전히 entity 부재 |
| 다중 템플릿 | ❌ | ✅ (2종) | shared-space-ui/blog/blogTemplates.tsx |
| post 단위 template 지정 | ❌ | ❌ (?template= override만) | post 컬럼 부재 |
| 미리보기 / 공개 URL 복사 | ❌ | ✅ | PharmacyBlogPage:240, 255 |
| SEO meta(title / og:*) | ❌ | ✅ | useBlogSeo |
| Helmet | ❌ | ❌ | 여전히 imperative useEffect |
| 매장 Identity 헤더 | ❌ | ✅ | BlogPublicHeader |
| RichText 본문 (HTML, sanitize) | ❌ | ✅ | RichTextEditor + ContentRenderer |
| AI 변환 (UI 연동) | ❌ | ✅ | AiContentModal + /api/ai/content |
| AI Context 저장 | ❌ | ❌ | aiContext 컬럼 부재 |
| Service layer 분리 | ❌ | ❌ | 여전히 controller inline |
| 본문 영구 라이브러리 연결 | ❌ | ❌ | library_item_id FK 부재 |
| 자료함 → 제작 시작 단일 진입 | △ | ✅ | "새 글 작성" 버튼 제거됨 |
| 공통 패키지 (blog-core) | ❌ | ❌ (shared-space-ui 부분 대체) | 여전히 정식 패키지 부재 |
| shared-space-ui Blog 자산 추출 | ❌ | ✅ (4개) | UI-PARTIAL-EXTRACT WO |
| 예약 발행 / 자동 저장 | ❌ | ❌ | 여전히 부재 |
| 댓글 / 반응 | ❌ | ❌ | 여전히 부재 |
| 본문 sanitize | ❌ | ✅ (ContentRenderer) | TipTap + ContentRenderer |
| Slug history / redirect | △ | ✅ | StoreSlugService 통합 |
| 양방향 navigation (Blog ↔ 매장 메인) | ❌ | ✅ | BlogPublicHeader "← 매장 메인으로" |

---

## Appendix A. 핵심 파일 인덱스 (refresh)

### Frontend — KPA
- 관리: [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx)
- 공개 목록: [services/web-kpa-society/src/pages/store/StoreBlogPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx)
- 공개 상세: [services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPostPage.tsx)
- 매장 미니 사이트: [services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx)
- 자료함: [services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx)
- 제작 시작 모달: [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx)
- App 라우트: [services/web-kpa-society/src/App.tsx](services/web-kpa-society/src/App.tsx) (라인 905-912 부근)

### Frontend — GlycoPharm
- 관리: [services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx](services/web-glycopharm/src/pages/store-management/PharmacyBlogPage.tsx)
- 공개: [services/web-glycopharm/src/pages/store/StoreBlogPage.tsx](services/web-glycopharm/src/pages/store/StoreBlogPage.tsx) 등

### Shared (UI 공통화)
- BlogPublicHeader: [packages/shared-space-ui/src/blog/BlogPublicHeader.tsx](packages/shared-space-ui/src/blog/BlogPublicHeader.tsx)
- blogTemplates: [packages/shared-space-ui/src/blog/blogTemplates.tsx](packages/shared-space-ui/src/blog/blogTemplates.tsx)
- useBlogSeo: [packages/shared-space-ui/src/blog/useBlogSeo.ts](packages/shared-space-ui/src/blog/useBlogSeo.ts)
- client: [packages/shared-space-ui/src/blog/client.ts](packages/shared-space-ui/src/blog/client.ts)
- BLOG_LIST 블록: [packages/ui/src/store-blocks/blocks/blog-list.block.tsx](packages/ui/src/store-blocks/blocks/blog-list.block.tsx)

### Backend
- Controller factory: [apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts)
- Public unified handler: [apps/api-server/src/routes/platform/store-public-content.handler.ts](apps/api-server/src/routes/platform/store-public-content.handler.ts)
- Unified routes: [apps/api-server/src/routes/platform/unified-store-public.routes.ts](apps/api-server/src/routes/platform/unified-store-public.routes.ts)
- KPA route 등록: [apps/api-server/src/routes/kpa/kpa.routes.ts:408](apps/api-server/src/routes/kpa/kpa.routes.ts#L408)
- GlycoPharm route 등록: [apps/api-server/src/routes/glycopharm/glycopharm.routes.ts](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts)
- AI proxy: [apps/api-server/src/routes/ai-proxy.routes.ts:193-257](apps/api-server/src/routes/ai-proxy.routes.ts#L193)
- Blog AI prompt: [apps/api-server/src/services/ai-prompts/blog.ts](apps/api-server/src/services/ai-prompts/blog.ts)
- Entity (post): [apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts)
- Entity (settings): [apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-settings.entity.ts)
- Migrations:
  - [1771200000006-CreateStoreBlogPosts.ts](apps/api-server/src/database/migrations/1771200000006-CreateStoreBlogPosts.ts)
  - [20260918000000-CreateStoreBlogSettings.ts](apps/api-server/src/database/migrations/20260918000000-CreateStoreBlogSettings.ts)

### 비교용 (Forum-core 패턴)
- [packages/forum-core/](packages/forum-core/) — backend / admin-ui / public-ui / templates / lifecycle / manifest

### Slug 처리
- [apps/api-server/src/modules/store-core/services/StoreSlugService.ts](apps/api-server/src/modules/store-core/services/StoreSlugService.ts)
- platform_store_slugs / platform_store_slug_history 테이블

---

## Appendix B. 관련 Work Order 목록 (V1 → 현재 사이 머지)

| 시점 | WO | 내용 |
|---|---|---|
| ~ V1 | WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS | 자료함 / 제작 시작 canonical 정렬 |
| 이후 | WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1 | 매장 identity 헤더 + 템플릿 2종 + SEO |
| 이후 | WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1 | 본문 RichText 정렬 |
| 이후 | WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1 | AI 콘텐츠 보조 wiring |
| 이후 | WO-O4O-KPA-STORE-BLOG-META-V1 | Blog identity 메타 entity 도입 |
| 이후 | WO-O4O-NETURE-BLOG-CANONICAL-ALIGN-V1 | Neture를 KPA canonical 정렬 |
| 이후 | WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1 | 검증된 UI 모듈 → shared-space-ui |
| 이후 | WO-O4O-NETURE-BLOG-RETIRE-V1 | Neture Blog 잔여 구조 제거 |
| 이후 | WO-O4O-GLYCO-BLOG-INTRODUCE-V1 | GlycoPharm Blog 도입 (canonical 적용) |

---

*조사 마감 (refresh): 2026-05-09*
*상태: 조사 완료, Phase 1 (운영 기능 보강) 후속 WO 분기 대기*
