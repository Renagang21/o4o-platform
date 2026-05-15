# IR-O4O-OPERATOR-DASHBOARD-UI-RESTRUCTURE-AUDIT-V1

> **조사 목적:** 운영자 대시보드 UI 재구성 전 영향 분석. 커뮤니티 운영 / 매장 HUB 운영 분리 가능성, dead UI 처리, 메뉴 재편 시 수정 파일 특정.
>
> **전제:** 현재 `/operator/*` 는 KPA Society 기준 단일 통합 구조. 재구성은 개발 전 조사 단계임.
>
> **조사 일자:** 2026-05-15
>
> **기준 커밋:** main (6f5835084)
>
> **상태:** COMPLETE

---

## 목차

1. [핵심 발견사항 요약](#1-핵심-발견사항-요약)
2. [첫 화면 구조](#2-첫-화면-구조)
3. [좌측 메뉴 생성 방식](#3-좌측-메뉴-생성-방식)
4. [프로필 → 운영 대시보드 진입 방식](#4-프로필--운영-대시보드-진입-방식)
5. [라우트 전체 구조](#5-라우트-전체-구조)
6. [Event Offer dead UI 현황](#6-event-offer-dead-ui-현황)
7. [Forced Content 현황](#7-forced-content-현황)
8. [커뮤니티 / 매장 HUB 분리 영향 분석](#8-커뮤니티--매장-hub-분리-영향-분석)
9. [수정 필요 파일 목록](#9-수정-필요-파일-목록)
10. [후속 WO 후보](#10-후속-wo-후보)

---

## 1. 핵심 발견사항 요약

### F1. Operator 대시보드 = 실동작 통합 구조

`/operator/*` 전체가 KPA Society 기준으로 완전 구현 완료.  
5-Block 구조(KPI · AI Summary · Action Queue · Activity Log · Quick Actions) 표준화.  
API 연결 완료, 역할 기반 메뉴 필터 작동 중.

### F2. 메뉴는 정적 배열 + 역할 필터

`operatorMenuGroups.ts`에 UNIFIED_MENU 상수로 전체 항목 고정.  
`filterMenuByRole()` 함수가 `adminOnly: true` 항목을 operator 사용자에게 숨김.  
서비스별(KPA/GlycoPharm/Neture) 별도 파일로 분리되어 있으나 동일한 구조 패턴 사용.

### F3. 헤더 진입점 = KpaGlobalHeader 단일 지점

`KpaGlobalHeader.tsx`에서 역할 판정 후 `/operator` 또는 `/admin` 링크 하나만 노출.  
분리 시 헤더에 다중 링크 추가 또는 랜딩 페이지 신설 필요.

### F4. Event Offer Operator 페이지 = 실동작 (dead 아님)

`/operator/event-offers` 라우트 + `EventOfferManagePage` — 승인 워크플로우 완전 구현.  
메뉴에 "이벤트 오퍼 승인" 항목 등록됨. **삭제 대상 아님.**

### F5. Forced Content = 실동작. Force Asset = 미구현(해당 항목 없음)

`/operator/signage/forced-content` — CRUD 완전 구현, API 연결됨.  
`Force Asset`(강제 자산)이라는 별도 항목은 코드베이스에 존재하지 않음.  
Forced Content로 통합된 상태. placeholder 처리 대상 없음.

### F6. 커뮤니티 / 매장 HUB 분리 = 7개 핵심 파일 영향

현재 단일 통합 구조. 분리 시 라우트 · 메뉴 · 대시보드 · 래퍼 · 헤더 · Capability · Config 7개 파일 수정 필요.

---

## 2. 첫 화면 구조

### 진입 라우트

```
/operator (index)
→ KpaOperatorLayoutWrapper (사이드바 + 헤더 래퍼)
  → KpaOperatorDashboard (5-Block 대시보드)
```

**파일:**
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` — 라인 62
- `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`
- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx`

### 5-Block 구성 (operatorConfig.ts 기준)

| Block | 내용 | 데이터 소스 |
|-------|------|-----------|
| **Block 1: KPI Grid** | 회원 승인, 포럼 요청, 콘텐츠 발행, 사이니지 검수, 약국 서비스, 상품 신청 (6개) + admin 전용 2개 | Promise.allSettled 6개 API |
| **Block 2: AI Summary** | severity 기반 3개 항목 (critical → warning → info 정렬) | 건수 기반 동적 생성 |
| **Block 3: Action Queue** | 처리 필요 항목 최대 7개 (count + link) | 각 API 건수 합산 |
| **Block 4: Activity Log** | 최근 활동 최대 15개 (타임스탬프 내림차순) | operatorApi.getSummary() |
| **Block 5: Quick Actions** | 7개 operator 기본 + 3개 admin 전용 | 정적 설정 |

### API 엔드포인트 (대시보드 초기 로드)

```
GET /api/v1/operator/summary              ← 통합 summary
GET /members?status=pending               ← 승인 대기 회원 수
GET /pharmacy-requests/pending            ← 약국 신청 대기
GET /api/v1/operator/stores?limit=1       ← 매장 총 건수
GET /operator/product-applications/stats  ← 상품 신청 통계
GET /members (admin only)                 ← 전체 회원 수
GET /organization-join-requests/pending (admin only)
```

---

## 3. 좌측 메뉴 생성 방식

### 메뉴 정의 파일

**파일:** `services/web-kpa-society/src/config/operatorMenuGroups.ts`

### UNIFIED_MENU 구조 (11개 그룹, 라인 26-83)

```
1. dashboard    — 대시보드
2. users        — 회원 관리
3. approvals    — 상품 신청, 이벤트 오퍼 승인, 협업 문의
4. content      — 공지/뉴스, Home 편집, 콘텐츠 허브
5. resources    — 자료실 관리
6. lms          — 강의 관리, 강사 승인, 안내 문구 관리
7. signage      — HQ 미디어, HQ 플레이리스트, 템플릿, 강제 콘텐츠
8. forum        — 포럼 운영, 포럼 관리, 삭제 요청, 포럼 분석
9. analytics    — AI 리포트, 운영 분석
10. pharmacy    — 약국 신청 관리 (KPA 특화)
11. system      — 법률 관리, 감사 로그, 역할 관리 (adminOnly)
```

### 메뉴 적용 흐름

```typescript
// KpaOperatorLayoutWrapper.tsx 라인 29-31
const menuItems = useMemo(
  () => filterMenuByRole(UNIFIED_MENU, isAdmin),
  [isAdmin],
);
```

- `filterMenuByRole()` — `adminOnly: true` 항목을 operator에게 숨김
- 렌더링: `KpaOperatorSidebar` 컴포넌트 (menuItems 배열 순서대로)

### 서비스별 메뉴 분리 현황

| 서비스 | 메뉴 파일 | 상태 |
|-------|---------|------|
| KPA Society | `services/web-kpa-society/src/config/operatorMenuGroups.ts` | 완성 |
| GlycoPharm | `services/web-glycopharm/src/config/operatorMenuGroups.ts` | 별도 파일 |
| Neture | `services/web-neture/src/config/operatorMenuGroups.ts` | 별도 파일 |

메뉴 구조 패턴(UNIFIED_MENU + filterMenuByRole)은 동일, 항목은 서비스별 맞춤.

---

## 4. 프로필 → 운영 대시보드 진입 방식

### 헤더 진입점

**파일:** `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` — 라인 139-147

```typescript
{isAdmin ? (
  <GlobalHeaderMenuItem to="/admin" icon={<Shield />}>
    관리자 대시보드
  </GlobalHeaderMenuItem>
) : isOperator ? (
  <GlobalHeaderMenuItem to="/operator" icon={<Shield />}>
    운영 대시보드
  </GlobalHeaderMenuItem>
) : null}
```

### 역할 판정

```typescript
isAdmin    = isAdminOrAbove(user.roles, 'kpa')    // 라인 69
isOperator = isOperatorOrAbove(user.roles, 'kpa') // 라인 70
```

Helper: `@o4o/auth-utils` 패키지

### 진입 방식 특징

- 단일 링크 구조: admin이면 `/admin`, operator이면 `/operator`, 그 외 없음
- 대시보드 분리 시 헤더에 추가 링크 또는 `/operator` 내 랜딩 페이지 신설 필요
- 현재 "매장 HUB 운영"과 "커뮤니티 운영" 구분 없이 단일 `/operator` 진입

---

## 5. 라우트 전체 구조

**파일:** `services/web-kpa-society/src/routes/OperatorRoutes.tsx`

```
/operator/*
├── /                         — KpaOperatorDashboard (5-Block 통합 대시보드)
├── /ai-report                — OperatorAiReportPage
├── /forum-management         — ForumManagementPage
├── /community                — CommunityManagementPage
├── /forum-delete-requests    — ForumDeleteRequestsPage
├── /forum-analytics          — ForumAnalyticsDashboard
├── /content                  — ContentManagementPage
├── /signage/
│   ├── /hq-media             — HqMediaPage
│   ├── /hq-media/:mediaId    — HqMediaDetailPage
│   ├── /hq-playlists         — HqPlaylistsPage
│   ├── /hq-playlists/:id     — HqPlaylistDetailPage
│   ├── /templates            — TemplatesPage
│   ├── /templates/:id        — TemplateDetailPage
│   └── /forced-content       — ForcedContentPage ✅ 실동작
├── /legal                    — LegalManagementPage (admin-only)
├── /audit-logs               — AuditLogPage (admin-only)
├── /docs                     — OperatorContentHubPage
├── /content-hub/:id          — OperatorContentDetailPage
├── /resources                — OperatorResourcesPage
├── /resources/new            — OperatorContentHubPage
├── /resources/:id/edit       — OperatorContentDetailPage
├── /working-content          — WorkingContentListPage
├── /working-content/:id      — WorkingContentEditPage
├── /forum                    — OperatorForumPage
├── /members                  — MemberManagementPage
├── /pharmacy-requests        — PharmacyRequestManagementPage
├── /product-applications     — ProductApplicationManagementPage
├── /event-offers             — EventOfferManagePage ✅ 실동작
├── /qualification-requests   — QualificationRequestsPage
├── /lms                      — OperatorLmsCoursesPage
├── /guide-contents           — OperatorGuideContentsPage
├── /stores                   — OperatorStoresPage
├── /stores/:storeId          — OperatorStoreDetailPage
├── /store-channels           — OperatorStoreChannelsPage
├── /users/:id                — UserDetailPage
├── /collaboration-requests   — CollaborationRequestsPage
├── /analytics                — OperatorAnalyticsPage
├── /roles                    — RoleManagementPage (admin-only)
│
├── /news → /operator/content (redirect)
├── /lms/courses → /operator/lms (redirect)
└── /users → /operator/members (redirect)
```

**총 라우트:** 34개 (redirect 3개 포함)

### 영역별 분류

| 영역 | 라우트 수 | 비고 |
|------|---------|------|
| 커뮤니티 (Forum/Members) | 7개 | forum, community, members, qualification-requests |
| 콘텐츠 (Content/Docs) | 7개 | content, docs, resources, working-content |
| 사이니지 (Signage) | 7개 | hq-media, hq-playlists, templates, forced-content |
| 비즈니스 (Store/Event Offer) | 5개 | stores, store-channels, event-offers, product-applications, collaboration-requests |
| LMS | 2개 | lms, guide-contents |
| 어드민 전용 | 3개 | legal, audit-logs, roles |
| 분석 | 2개 | ai-report, analytics |

---

## 6. Event Offer dead UI 현황

### 판단: dead 아님 — 실동작 중

| 항목 | 내용 |
|------|------|
| 라우트 | `/operator/event-offers` |
| 페이지 | `EventOfferManagePage.tsx` |
| API | `eventOfferAdminApi` 연결 완료 |
| 기능 | 목록 조회, 노출 토글, 승인/반려 워크플로우 |
| 메뉴 | `approvals` 그룹 "이벤트 오퍼 승인" 항목 등록 |

### 이번 작업 포함 여부

**제외 권장.** 현재 실동작 중이므로 이번 UI 재구성 작업에서 건드릴 필요 없음.  
장기적으로 `groupbuy-admin` 경로명 정리(WO-O4O-EVENT-OFFER-CANONICAL-RENAME-V1) 시 함께 처리.

---

## 7. Forced Content 현황

### 판단: 실동작 — placeholder 처리 대상 없음

| 항목 | 내용 |
|------|------|
| 라우트 | `/operator/signage/forced-content` |
| 페이지 | `ForcedContentPage.tsx` |
| 기능 | CRUD 완전 구현, 기간 설정, YouTube/Vimeo 지원 |
| API | `/api/signage/{SERVICE_KEY}/hq/forced-content` |
| 메뉴 | `signage` 그룹 "강제 콘텐츠" 항목 등록 |

### Force Asset 현황

`Force Asset`이라는 별도 개념/페이지/메뉴 항목은 코드베이스에 존재하지 않음.  
`Forced Content`가 동일한 역할을 담당. 추가 placeholder 처리 불필요.

---

## 8. 커뮤니티 / 매장 HUB 분리 영향 분석

### 현재 구조

모든 기능이 단일 `/operator` 영역에 통합. 래퍼, 메뉴, 라우트, 대시보드 전부 하나.

### 분리 시나리오 (예시)

```
/operator              — 공통 랜딩 또는 기존 통합 대시보드 유지
/operator/community    — 커뮤니티 운영 (Forum, Members, LMS, 포럼 분석)
/operator/store-hub    — 매장 HUB 운영 (Store, Event Offer, Product, Signage)
```

### 영향 파일별 수정 내용

#### 1. OperatorRoutes.tsx
- 현황: 34개 라우트 단일 파일
- 수정: `/community/*`, `/store-hub/*` 등 하위 라우트 그룹 분기 또는 파일 분리

#### 2. operatorMenuGroups.ts
- 현황: UNIFIED_MENU 11개 그룹 통합 배열
- 수정: 그룹을 커뮤니티 / 매장 HUB 두 MENU 상수로 분리 또는 컨텍스트별 필터 추가

#### 3. KpaOperatorDashboard.tsx
- 현황: 5-Block 대시보드 단일 구현
- 수정: 커뮤니티 대시보드 / 매장 HUB 대시보드 별도 구현 또는 prop 기반 분기

#### 4. operatorConfig.ts
- 현황: KPI/Block 설정 전체가 단일 파일
- 수정: 도메인별 Block 설정 분리 (communityBlocks, storeHubBlocks 등)

#### 5. KpaOperatorLayoutWrapper.tsx
- 현황: 단일 Sidebar + Header 조합
- 수정: 컨텍스트(커뮤니티/매장) 전달 → 메뉴 필터 적용 또는 별도 래퍼 추가

#### 6. KpaGlobalHeader.tsx
- 현황: `/operator` 단일 링크
- 수정: 분리 대시보드별 링크 추가 또는 `/operator` 진입 후 역할 기반 랜딩

#### 7. operatorCapabilities.ts
- 현황: 통합 Capability 정의
- 수정: 도메인별 Capability 필터 추가 (없으면 그대로 유지 가능)

### 분리 영향도 평가

| 파일 | 영향도 | 재사용 가능 여부 |
|------|-------|--------------|
| OperatorRoutes.tsx | 높음 | 파일 유지, 내부 분기 추가 |
| operatorMenuGroups.ts | 높음 | 상수 분리 또는 필터 추가 |
| KpaOperatorDashboard.tsx | 높음 | 신규 페이지 필요 가능 |
| operatorConfig.ts | 중간 | Block 설정 분리 |
| KpaOperatorLayoutWrapper.tsx | 중간 | prop 추가 또는 래퍼 분기 |
| KpaGlobalHeader.tsx | 중간 | 링크 추가 |
| operatorCapabilities.ts | 낮음 | 변경 없을 수도 있음 |

### 기존 페이지 재사용 가능 여부

각 세부 페이지(ForumManagementPage, OperatorStoresPage 등)는 **그대로 재사용 가능**.  
라우트 경로만 변경되거나 새 그룹 라우트로 이동.  
신규 구현 필요한 파일: 커뮤니티/매장 HUB 각각의 랜딩 대시보드 페이지 (선택적).

---

## 9. 수정 필요 파일 목록

| 파일 경로 | 현황 | 재구성 시 수정 내용 | 우선순위 |
|---------|------|-----------------|---------|
| `services/web-kpa-society/src/routes/OperatorRoutes.tsx` | 통합 34개 라우트 | 라우트 그룹 분기 | **높음** |
| `services/web-kpa-society/src/config/operatorMenuGroups.ts` | UNIFIED_MENU 11그룹 | 도메인별 메뉴 상수 분리 | **높음** |
| `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | 단일 5-Block 대시보드 | 도메인별 대시보드 신설 가능 | **높음** |
| `services/web-kpa-society/src/pages/operator/operatorConfig.ts` | 통합 Block 설정 | Block 도메인별 분리 | 중간 |
| `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | 단일 래퍼 | prop/context 추가 | 중간 |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | 단일 진입 링크 | 다중 대시보드 링크 또는 랜딩 | 중간 |
| `services/web-kpa-society/src/config/operatorCapabilities.ts` | 통합 Capability | 도메인별 필터 (선택) | 낮음 |
| `services/web-kpa-society/src/api/operator.ts` | API 정의 | 분리 후에도 유지 가능 | 낮음 |

---

## 10. 후속 WO 후보

### WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-SPLIT-V1

**목적:** 커뮤니티 운영 / 매장 HUB 운영 대시보드 분리  
**범위:**
- `operatorMenuGroups.ts` — 도메인별 메뉴 그룹 분리
- `OperatorRoutes.tsx` — 라우트 그룹 분기
- `KpaGlobalHeader.tsx` — 진입점 다중화 또는 랜딩 페이지 신설
- 신규 대시보드 페이지 (선택, 기존 5-Block 재사용 가능)

**사전 조건:** 분리 기준(커뮤니티 vs 매장 HUB) 확정  
**위험도:** MEDIUM (운영 중 메뉴/라우트 변경 → 기존 즐겨찾기 깨질 수 있음)

---

### WO-O4O-MAIN-SITE-GROUPBUY-CLEANUP-V1 (IR-O4O-GROUPBUY-LEGACY-RESIDUE-AUDIT-V1 연동)

**목적:** main-site의 dead `공동구매` UI 정리  
**사전 조건:** main-site 서비스 정체성 결정 (이번 UI 재구성과 분리 판단)  
**이번 작업 포함 여부:** 별도 WO 권장. 이번 UI 재구성과 직접 연관 없음.

---

*Auditor: Claude Code (IR-O4O-OPERATOR-DASHBOARD-UI-RESTRUCTURE-AUDIT-V1)*  
*Date: 2026-05-15*  
*Method: OperatorRoutes.tsx + operatorMenuGroups.ts + KpaOperatorDashboard.tsx + KpaGlobalHeader.tsx + operatorConfig.ts 직접 조사*  
*Status: Complete*
