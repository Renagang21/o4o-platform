# IR-O4O-NETURE-COMMUNITY-STATE-AUDIT-V1

> Neture 서비스 Community/Forum 현재 상태 조사 보고서
> 조사일: 2026-03-15

---

## 1. Executive Summary

### 핵심 판정

| 질문 | 답변 |
|------|------|
| Neture에 Community 기능이 존재하는가? | **YES — 이미 상당히 구현되어 있음** |
| Neture에 Forum 기능이 존재하는가? | **YES — ForumHub + List + Write + Detail 완비** |
| Community Hub API가 존재하는가? | **NO — Ads/Sponsors API만 미구현** |
| GlycoPharm 템플릿 적용이 필요한가? | **부분 적용 — Ads/Sponsors만 추가하면 됨** |

### Neture vs GlycoPharm 비교

| 기능 | GlycoPharm | Neture | GAP |
|------|:----------:|:------:|:---:|
| Community Hub 페이지 | ✅ | ✅ CommunityPage | **없음** |
| Forum Hub (Daum 스타일) | ✅ | ✅ ForumHubPage | **없음** |
| Forum 글 목록 | ✅ | ✅ ForumPage | **없음** |
| Forum 글 작성 | ✅ | ✅ ForumWritePage | **없음** |
| Forum 글 상세 | ✅ | ✅ ForumPostPage | **없음** |
| Forum API (Backend) | ✅ | ⚠️ 읽기 전용 | **쓰기 경로 확인 필요** |
| Hero Banner (Ads) | ✅ | ❌ | **API 추가 필요** |
| Sponsor Bar | ✅ | ❌ | **API 추가 필요** |
| Operator Community CRUD | ✅ | ❌ | **Controller 추가 필요** |
| Header Community 메뉴 | ✅ | ✅ NetureLayout | **없음** |

### 결론

> **Neture Community는 "새로 만드는 것"이 아니라 "기존 기능에 Ads/Sponsors만 추가하는 것"이다.**

---

## 2. Frontend 조사

### 2.1 Header 메뉴

| 파일 | Community 메뉴 |
|------|---------------|
| `services/web-neture/src/components/Header.tsx` | ❌ 없음 (Home, Trials, B2B 조달만) |
| `services/web-neture/src/components/layouts/NetureLayout.tsx` | ✅ **Community 메뉴 존재** (line 47-48, `/community` 링크) |

### 2.2 Router 구조 (`App.tsx`)

Neture는 **매우 풍부한 라우트 구조**를 가지고 있음:

#### Community Routes (lines 425-437)
```
/community                           → CommunityPage (hub)
/community/announcements             → CommunityAnnouncementsPage
/community/announcements/:id         → CommunityAnnouncementDetailPage
/community/signage                   → CommunitySignagePage
/community/forum                     → ForumHubPage
/community/forum/posts               → ForumPage
/community/forum/write               → ForumWritePage
/community/forum/post/:slug          → ForumPostPage
/community/write                     → ForumWritePage (articles)
/community/article/:slug             → ForumPostPage
```

#### Supplier/Partner Forum (lines 462, 507)
```
/supplier/forum                      → ForumPage
/partner/forum                       → ForumPage
```

#### Public Forum (lines 561-566)
```
/forum                               → ForumPage (Test Center)
/forum/write                         → ForumWritePage
/forum/post/:slug                    → ForumPostPage
```

#### Workspace Forum (lines 598-601)
```
/workspace/forum                     → ForumHubPage
/workspace/forum/posts               → ForumPage
/workspace/forum/write               → ForumWritePage
/workspace/forum/post/:slug          → ForumPostPage
```

### 2.3 Community Hub 페이지

**파일**: `services/web-neture/src/pages/CommunityPage.tsx`

**기존 구현 섹션** (9개 섹션):

| # | 섹션 | 내용 |
|---|------|------|
| 1 | Hero Section | Gradient 배경 + "Community" 타이틀 |
| 2 | 공지사항 | CMS 기반 announcements (isPinned 지원) |
| 3 | 콘텐츠 | 3-column grid featured articles |
| 4 | Articles | Forum 기반 기사 시스템 |
| 5 | Knowledge | 지식 라이브러리 |
| 6 | 최근 포럼 글 | 최신 포럼 포스트 |
| 7 | 인기 포럼 | 카테고리별 활동 통계 |
| 8 | 커뮤니티 통계 | 주간 활동 메트릭 |
| 9 | Digital Signage | 사이니지 콘텐츠 허브 링크 |

**GlycoPharm과 비교**: Neture CommunityPage가 **더 풍부함** (GlycoPharm은 방금 구현, Neture는 이미 9개 섹션 존재)

### 2.4 Forum 페이지

| 페이지 | 파일 | 상태 |
|--------|------|------|
| ForumHubPage | `pages/forum/ForumHubPage.tsx` | ✅ Daum 카페 스타일 (카테고리 카드, 활동 배지) |
| ForumPage | `pages/forum/ForumPage.tsx` | ✅ 테이블 기반 (검색, 필터, 정렬, 페이지네이션) |
| ForumWritePage | `pages/forum/ForumWritePage.tsx` | ✅ RichTextEditor (@o4o/content-editor) |
| ForumPostPage | `pages/forum/ForumPostPage.tsx` | ✅ 글 상세 + 댓글 |

### 2.5 누락 컴포넌트

| 컴포넌트 | GlycoPharm | Neture |
|----------|:----------:|:------:|
| `HeroBannerSection.tsx` | ✅ | ❌ **없음** |
| `AdSection.tsx` | ✅ | ❌ **없음** |
| `SponsorBar.tsx` | ✅ | ❌ **없음** |
| `useStoreCapabilities.ts` | ✅ | ❌ **없음** |
| `communityApi.ts` (Ads/Sponsors) | ✅ | ❌ **없음** |

---

## 3. Backend 조사

### 3.1 Neture API 엔드포인트

**파일**: `apps/api-server/src/routes/neture/controllers/neture.controller.ts` (600 lines)

**현재 API 구조**:
```
# Public
GET  /api/v1/neture/suppliers
GET  /api/v1/neture/suppliers/:slug
GET  /api/v1/neture/content
GET  /api/v1/neture/content/:id
GET  /api/v1/neture/home/signage
GET  /api/v1/neture/home/forum              ← Forum 읽기 전용
GET  /api/v1/neture/partnership/requests

# Authenticated
POST /api/v1/neture/content/:id/recommend
POST /api/v1/neture/content/:id/view
POST /api/v1/neture/partnership/requests

# Admin (neture:admin)
GET    /api/v1/neture/admin/dashboard/summary
GET    /api/v1/neture/admin/operators
PATCH  /api/v1/neture/admin/operators/:id/deactivate
PATCH  /api/v1/neture/admin/operators/:id/reactivate
```

### 3.2 Forum 통합

```typescript
// neture.controller.ts line 47-50
const forumService = new ForumQueryService(dataSource, {
  scope: 'community',
});

// line 221-230: 홈 페이지 포럼 프리뷰
router.get('/home/forum', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const posts = await forumService.listRecentPosts(limit);
  res.json({ success: true, data: { posts } });
});
```

**현재**: 읽기 전용 (`ForumQueryService.listRecentPosts`)
**Forum 쓰기**: 프론트엔드 `forumApi.ts`에 `createForumPost`, `updateForumPost` 존재 → 공용 Forum API 경유 추정

### 3.3 Community Hub Controller

| 서비스 | Controller | Service Code |
|--------|-----------|:------------:|
| KPA | `kpa/controllers/community-hub.controller.ts` | `kpa` |
| GlycoPharm | `glycopharm/controllers/glycopharm-community-hub.controller.ts` | `glycopharm` |
| K-Cosmetics | `cosmetics/controllers/cosmetics-community-hub.controller.ts` | `cosmetics` |
| **Neture** | **❌ 없음** | — |

### 3.4 Community Ads/Sponsors 테이블

**migration**: `1771200000015-CreateCommunityHubTables.ts`

```sql
community_ads (id, service_code, type, title, image_url, link_url, start_date, end_date, display_order, is_active)
community_sponsors (id, service_code, name, logo_url, link_url, display_order, is_active)
```

- `service_code` 컬럼이 **서비스 무관** (multi-tenant)
- `'neture'` 값 사용 가능 — **테이블 변경 불필요**

### 3.5 공유 서비스

**파일**: `apps/api-server/src/routes/kpa/services/community-hub.service.ts` (237 lines)

`CommunityHubService`는 **service-agnostic** 설계:
- 모든 메서드가 `serviceCode` 파라미터를 받음
- `WHERE service_code = $1` 필수 (Boundary Policy 준수)
- KPA, GlycoPharm, Cosmetics 모두 동일 서비스 사용

---

## 4. Community Template 적용 가능성

| 항목 | 판정 | 설명 |
|------|------|------|
| Community Hub | **ACTIVE** | CommunityPage 이미 9개 섹션 구현 |
| Forum | **ACTIVE** | ForumHub + List + Write + Detail 완비 |
| Forum Extension | **ACTIVE** | Supplier/Partner/Workspace 포럼 존재 |
| Video | **ACTIVE** | Signage 통합 존재 |
| Docs | **ACTIVE** | Knowledge 섹션 존재 |
| Ads (Hero Banner) | **NOT IMPLEMENTED** | Backend API + Frontend 컴포넌트 모두 없음 |
| Sponsors | **NOT IMPLEMENTED** | Backend API + Frontend 컴포넌트 모두 없음 |

---

## 5. Neture 특이사항

### 5.1 B2B 성격

Neture는 다른 서비스와 달리 **B2B 성격**이 강함:
- `/supplier/` — 공급자 공간 (별도 Layout)
- `/partner/` — 파트너 공간 (별도 Layout)
- `/workspace/` — 운영 공간 (Operator)

Community는 이 3개 공간을 **연결하는 허브** 역할:
```
Supplier Space ── Forum ──┐
Partner Space  ── Forum ──┤── Community Hub
Workspace      ── Forum ──┘
```

### 5.2 Community가 이미 가장 풍부한 서비스

Neture CommunityPage는 **9개 섹션**으로 GlycoPharm(방금 구현)보다 훨씬 풍부함.

| 서비스 | Community 섹션 수 | 상태 |
|--------|:-----------------:|------|
| KPA | 5-Block | 표준 |
| GlycoPharm | ~6 | 방금 구현 |
| K-Cosmetics | ~5 | 부분 구현 |
| **Neture** | **9** | **가장 풍부** |

### 5.3 Forum API 이중 경로

Neture의 Forum 쓰기는 두 가지 경로 가능성:
1. 프론트엔드 `forumApi.ts` → 공용 Platform Forum API
2. Neture 전용 `/api/v1/neture/forum/*` (현재 읽기 전용)

---

## 6. GAP 분석

### 추가 필요 항목 (최소)

| # | 영역 | 작업 | 난이도 |
|---|------|------|--------|
| 1 | Backend | `neture-community-hub.controller.ts` 생성 | **LOW** (GlycoPharm 복사 + service_code 변경) |
| 2 | Backend | `neture.routes.ts`에 마운트 | **LOW** (1줄 추가) |
| 3 | Frontend | `HeroBannerSection.tsx` 추가 | **LOW** (GlycoPharm 복사) |
| 4 | Frontend | `AdSection.tsx` 추가 | **LOW** (GlycoPharm 복사) |
| 5 | Frontend | `SponsorBar.tsx` 추가 | **LOW** (GlycoPharm 복사) |
| 6 | Frontend | `communityApi.ts` Ads/Sponsors API 클라이언트 | **LOW** |
| 7 | Frontend | CommunityPage에 Ads/Sponsors 통합 | **LOW** (기존 9개 섹션에 삽입) |

### 불필요 항목

| 영역 | 사유 |
|------|------|
| DB 마이그레이션 | `community_ads/sponsors` 테이블 이미 존재, `service_code='neture'`만 사용 |
| Forum 구현 | 이미 완비 (Hub + List + Write + Detail) |
| Community Hub 페이지 | 이미 9개 섹션 구현 |
| Router 변경 | `/community` 라우트 이미 존재 |
| Header 메뉴 | NetureLayout에 Community 메뉴 이미 존재 |

---

## 7. 파일 경로 참조

### Frontend
```
services/web-neture/src/pages/CommunityPage.tsx            — Community Hub (9섹션)
services/web-neture/src/pages/community/                    — Sub-pages (Announcements, Signage)
services/web-neture/src/pages/forum/ForumHubPage.tsx        — Forum Hub (Daum 스타일)
services/web-neture/src/pages/forum/ForumPage.tsx           — Forum List
services/web-neture/src/pages/forum/ForumWritePage.tsx      — Forum Write
services/web-neture/src/pages/forum/ForumPostPage.tsx       — Forum Detail
services/web-neture/src/services/forumApi.ts                — Forum API Client
services/web-neture/src/components/layouts/NetureLayout.tsx  — Main Layout (Community 메뉴)
services/web-neture/src/components/home/HomeForumSection.tsx — Home 포럼 프리뷰
services/web-neture/src/App.tsx                              — Router (lines 425-601)
```

### Backend
```
apps/api-server/src/routes/neture/neture.routes.ts          — Neture Routes
apps/api-server/src/routes/neture/controllers/neture.controller.ts — Main Controller (600 lines)
apps/api-server/src/routes/kpa/services/community-hub.service.ts   — 공유 CommunityHubService
```

### Template 참조 (GlycoPharm)
```
apps/api-server/src/routes/glycopharm/controllers/glycopharm-community-hub.controller.ts
services/web-glycopharm/src/components/community/HeroBannerSection.tsx
services/web-glycopharm/src/components/community/AdSection.tsx
services/web-glycopharm/src/components/community/SponsorBar.tsx
services/web-glycopharm/src/services/communityApi.ts
```

---

*IR-O4O-NETURE-COMMUNITY-STATE-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
