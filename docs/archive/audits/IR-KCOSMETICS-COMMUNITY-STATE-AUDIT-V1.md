# IR-KCOSMETICS-COMMUNITY-STATE-AUDIT-V1

## Investigation Report: K-Cosmetics Community / Forum 현재 상태 조사

**조사일**: 2026-03-14
**조사 대상**: K-Cosmetics (web-k-cosmetics / api-server)
**비교 대상**: KPA Society (web-kpa-society) Community Hub Template

---

## Executive Summary

예상과 달리 **K-Cosmetics에는 이미 Forum 기능이 구현되어 있다.**

| 영역 | 상태 | 설명 |
|------|------|------|
| Forum Pages | **ACTIVE** | ForumHubPage, ForumPage, PostDetailPage 3개 페이지 존재 |
| Forum API | **ACTIVE** | `/api/v1/forum/*` 공유 API 사용 중 |
| Signage/Video | **ACTIVE** | ContentHubPage + MediaDetail + PlaylistDetail |
| Community Hub | **NOT IMPLEMENTED** | KPA 스타일 7섹션 통합 Hub 없음 |
| Forum Write | **PARTIAL** | 코드에서 참조되나 라우트 미등록 |
| Header 메뉴 노출 | **NOT IMPLEMENTED** | Forum/Community 메뉴가 Header에 없음 |
| 자료실 (Docs) | **NOT IMPLEMENTED** | 없음 |
| AI 추천 | **ACTIVE** | `/api/v1/forum/recommendations/cosmetics` 전용 엔드포인트 존재 |

**결론**: Forum 기능은 존재하지만 **Header에 노출되지 않아 사용자가 접근할 수 없는 상태**이다. KPA Community Hub Template 적용이 필요한 영역은 **통합 Hub 페이지 + 메뉴 노출 + 글쓰기 기능**이다.

---

## 1. Frontend 조사 결과

### 1.1 메뉴 구조

**파일**: `services/web-k-cosmetics/src/components/common/Header.tsx` (432줄)

현재 Header 메뉴:

| 메뉴 | 경로 | 상태 |
|------|------|------|
| 홈 | `/` | ACTIVE |
| 문의하기 | `/contact` | ACTIVE |
| 매장 관리 | `/store` | ACTIVE (인증 필요) |
| 마이페이지 | `/mypage` | ACTIVE (모바일, 인증 필요) |
| **Community** | - | **없음** |
| **Forum** | - | **없음** |

**GAP**: Community/Forum 메뉴가 Header에 존재하지 않는다. 사용자는 직접 URL을 입력해야만 접근 가능하다.

---

### 1.2 라우트 구조

**파일**: `services/web-k-cosmetics/src/App.tsx`

| 라우트 | 컴포넌트 | 상태 | 비고 |
|--------|----------|------|------|
| `/forum` | ForumHubPage | ACTIVE | Lazy-loaded |
| `/forum/posts` | ForumPage | ACTIVE | Lazy-loaded |
| `/forum/post/:postId` | PostDetailPage | ACTIVE | Lazy-loaded |
| `/forum/write` | - | **미등록** | 코드에서 참조되나 라우트 없음 |
| `/partner/signage/content` | SignageContentHubPage | ACTIVE | |
| `/partner/signage/playlist/:id` | PlaylistDetailPage | ACTIVE | |
| `/partner/signage/media/:id` | MediaDetailPage | ACTIVE | |
| `/community` | - | **없음** | KPA Hub 스타일 미구현 |

---

### 1.3 Forum 페이지 상세

#### ForumHubPage (`pages/forum/ForumHubPage.tsx`, 466줄)
- Hero 섹션: "K-Cosmetics 포럼" 타이틀 + "글쓰기" 버튼 (→ `/forum/write` 링크, 미작동)
- ForumCardGrid: 포럼 카테고리 카드 그리드 (Daum 스타일)
- ActivitySection: 인기 + 최근 게시글
- WritePrompt: 글쓰기 유도 CTA
- InfoSection: 가이드라인 + 바로가기

#### ForumPage (`pages/forum/ForumPage.tsx`, 524줄)
- 테이블 레이아웃 게시글 목록
- 페이지네이션 (20개/페이지)
- 검색 + 타입 필터 + 정렬
- 고정글 상단 표시
- 게시글 유형: 공지(빨강), 질문(초록), 가이드(노랑), 토론(파랑), 투표(보라)

#### PostDetailPage (`pages/forum/PostDetailPage.tsx`, 273줄)
- 게시글 본문 + 댓글 표시
- Block 기반 콘텐츠 파싱
- 목록으로 돌아가기 링크

---

### 1.4 Forum API 서비스

**파일**: `services/web-k-cosmetics/src/services/forumApi.ts` (199줄)

| 함수 | 엔드포인트 | 용도 |
|------|-----------|------|
| `fetchForumPosts(params)` | GET `/api/v1/forum/posts` | 게시글 목록 |
| `fetchPinnedPosts(limit)` | GET `/api/v1/forum/posts?isPinned=true` | 고정글 |
| `fetchForumPostById(id)` | GET `/api/v1/forum/posts/{id}` | 게시글 상세 |
| `fetchForumComments(postId)` | GET `/api/v1/forum/posts/{postId}/comments` | 댓글 |
| `fetchPopularForums(limit)` | GET `/api/v1/forum/categories/popular` | 인기 포럼 |

**타입 import**: `@o4o/types/forum` 사용

---

### 1.5 Signage/Video 페이지

| 페이지 | 파일 | 기능 |
|--------|------|------|
| ContentHubPage | `pages/signage/ContentHubPage.tsx` | 탭 기반 플레이리스트/미디어 |
| MediaDetailPage | `pages/signage/MediaDetailPage.tsx` | YouTube 임베드 등 미디어 상세 |
| PlaylistDetailPage | `pages/signage/PlaylistDetailPage.tsx` | 플레이리스트 + 아이템 재생 |

**API**: `publicContentApi` → `k-cosmetics` serviceKey 사용

---

## 2. Backend 조사 결과

### 2.1 서비스 키

| 용도 | 키 | 출처 |
|------|-----|------|
| 내부 라우팅/메타데이터 | `cosmetics` | `constants/service-keys.ts` |
| 플랫폼 서비스 카탈로그 | `k-cosmetics` | `config/service-catalog.ts` |
| 도메인 | `k-cosmetics.site` | |

---

### 2.2 Forum API 구조

**공유 Forum 라우트**: `/api/v1/forum/*`
- 모든 서비스 공용 (KPA, K-Cosmetics, GlycoPharm 등)
- 인증 선택적 (읽기 공개, 쓰기 인증 필요)

**K-Cosmetics 전용 추천 엔드포인트**:
- `GET /api/v1/forum/recommendations/cosmetics`
- `ForumRecommendationController.getCosmeticsRecommendations()`
- 스킨타입, 피부 고민, 성분 선호도 기반 추천

**Forum App Manifest** (`appsCatalog.ts`):
```
App ID: forum-cosmetics
Name: "뷰티 포럼"
Description: "화장품/뷰티 특화 포럼"
Service Group: cosmetics
Status: hidden (개발 중)
Dependencies: forum-core >= 1.0.0
```

---

### 2.3 AI 기능

**ForumAIService** (`services/forum/ForumAIService.ts`):
- 도메인 감지: `cosmetics` / `yaksa` / `general`
- 자동 태그: skinType, concerns, productTypes

**K-Cosmetics 분석 항목**:

| 카테고리 | 키워드 (한/영) |
|----------|--------------|
| 피부타입 | 건성/dry, 지성/oily, 복합성/combination, 민감성/sensitive, 중성/normal |
| 피부고민 | 여드름/acne, 주름/wrinkle, 미백/whitening, 보습/moisturizing, 모공/pore |
| 제품유형 | 세럼/serum, 크림/cream, 토너/toner, 에센스/essence, 마스크/mask, 선크림/sunscreen |

---

### 2.4 ForumQueryService

**파일**: `modules/forum/forum-query.service.ts`

| 메서드 | 용도 |
|--------|------|
| `listRecentPosts()` | 홈페이지 최근 게시글 |
| `listForumHub()` | 포럼 카테고리 허브 |
| `listForumActivity()` | 카테고리별 최근 게시글 |
| `getForumAnalytics()` | KPI 통계 |
| `listPinnedPosts()` | 고정 게시글 |

스코프 모드: `community` (orgId IS NULL) / `organization` (특정 orgId)

---

### 2.5 데이터베이스 테이블

| 테이블 | 존재 | K-Cosmetics 전용 여부 |
|--------|------|---------------------|
| `forum_post` | YES | 공유 (serviceKey/orgId로 구분) |
| `forum_category` | YES | 공유 |
| `forum_comment` | YES | 공유 |
| `forum_post_like` | YES | 공유 |
| `cosmetics_forum_*` | **NO** | 전용 테이블 없음 |

---

## 3. KPA Community Hub Template 비교

### KPA CommunityHubPage 7섹션 구조

| # | 섹션 | KPA | K-Cosmetics |
|---|------|-----|-------------|
| 1 | HeroBannerSection (광고 캐러셀) | ACTIVE | **없음** |
| 2 | ForumSection (카테고리 카드 그리드) | ACTIVE | ForumHubPage에 유사 구현 존재 |
| 3 | LatestPostsSection (최근 게시글 5개) | ACTIVE | ForumHubPage ActivitySection에 유사 존재 |
| 4 | AdSection (페이지 광고) | ACTIVE | **없음** |
| 5 | VideoSection (Signage 미디어 4개) | ACTIVE | 별도 Signage 페이지에 분리되어 있음 |
| 6 | ResourceSection (자료실 링크) | ACTIVE | **없음** |
| 7 | SponsorBar (스폰서 로고) | ACTIVE | **없음** |

### KPA Header 메뉴 vs K-Cosmetics

| KPA | K-Cosmetics | GAP |
|-----|-------------|-----|
| 홈 | 홈 | - |
| **커뮤니티** `/community` | **없음** | GAP |
| **포럼** `/forum` | **없음** (라우트는 있으나 메뉴 없음) | GAP |
| 강의 `/lms` | - | N/A |
| 콘텐츠 `/news` | - | N/A |
| 약국 HUB `/hub` | - | N/A |
| - | 문의하기 `/contact` | N/A |
| 내 매장관리 `/store` | 매장 관리 `/store` | - |

---

## 4. GAP 분석

### 4.1 즉시 해결 필요 (Critical GAP)

| # | GAP | 현재 상태 | 필요 작업 |
|---|-----|----------|----------|
| G1 | **Header 메뉴 미노출** | Forum 라우트 있으나 메뉴 없음 | Header.tsx에 Community/Forum 메뉴 추가 |
| G2 | **글쓰기 라우트 미등록** | `/forum/write` 참조만 있고 라우트 없음 | ForumWritePage 구현 + 라우트 등록 |

### 4.2 Community Hub Template 적용 GAP

| # | GAP | 설명 | 우선순위 |
|---|-----|------|---------|
| G3 | **CommunityHubPage 부재** | `/community` 통합 Hub 페이지 없음 | HIGH |
| G4 | **HeroBannerSection 없음** | 광고 캐러셀 미구현 | MEDIUM |
| G5 | **VideoSection 통합 안됨** | Signage가 별도 경로에 분리 | MEDIUM |
| G6 | **ResourceSection 없음** | 자료실 기능 없음 | LOW |
| G7 | **SponsorBar 없음** | 스폰서 로고 바 없음 | LOW |
| G8 | **AdSection 없음** | 커뮤니티 페이지 광고 없음 | LOW |

### 4.3 이미 구현된 항목 (No GAP)

| 항목 | 상태 |
|------|------|
| Forum 카테고리 카드 그리드 | ForumHubPage에 구현됨 |
| Forum 게시글 목록 (테이블+페이지네이션) | ForumPage에 구현됨 |
| Forum 게시글 상세+댓글 | PostDetailPage에 구현됨 |
| Signage 콘텐츠 허브 | ContentHubPage에 구현됨 |
| 미디어/비디오 재생 | MediaDetailPage에 구현됨 |
| Forum API 연동 | forumApi.ts에 완전 구현됨 |
| AI 추천 엔드포인트 | Backend 완전 구현됨 |
| 게시글 유형 분류 | 5가지 타입 배지 구현됨 |

---

## 5. 결론 및 권장 사항

### 현재 상태 요약

```
K-Cosmetics Forum = IMPLEMENTED but HIDDEN
K-Cosmetics Community Hub = NOT IMPLEMENTED
K-Cosmetics Signage = IMPLEMENTED (별도 경로)
```

### 권장 작업 순서

**Phase 1: 즉시 적용 가능 (메뉴 노출)**
1. Header.tsx에 "포럼" 메뉴 추가 → `/forum`
2. 글쓰기 라우트 등록 → `/forum/write`

**Phase 2: Community Hub Template 적용**
1. CommunityHubPage 생성 → `/community`
2. KPA 7섹션 구조를 K-Cosmetics에 맞게 적용
3. Header에 "커뮤니티" 메뉴 추가
4. Signage 콘텐츠를 Community Hub에 통합 표시

**Phase 3: 부가 기능 (선택)**
1. 자료실 섹션 추가
2. 광고/스폰서 시스템 연동

### 주의 사항

- Forum Core 수정 불필요 (Frozen)
- API 계약 변경 불필요 (기존 공유 API 활용)
- 기존 서비스 영향 없음 (K-Cosmetics frontend only 변경)
- **구현 전 반드시 WO (Work Order) 작성 후 검토 필요**

---

*작성: Claude Opus 4.6*
*상태: 조사 완료 — 구현 대기*
