# IR-O4O-DEADCODE-PHASE3-LEGACY-RESIDUE-AUDIT-V1

> **조사 전용 문서 — 코드 수정 없음**
>
> 현재 실제 운영·개발 흐름에서 사용하지 않는 legacy residue를 공격적인 기준으로 재조사한 결과이다.
> "미래 가능성"은 판단 기준에서 제외한다. 현재 사용 여부만 기준으로 한다.

---

## 조사 메타

| 항목 | 내용 |
|------|------|
| 조사 일자 | 2026-05-15 |
| 조사 기준 | 현재 미사용 / 업무 흐름 단절 / redirect-only / 구조 복잡도만 증가 |
| 조사 대상 | KPA /demo/*, KPA /pharmacy/* chain, K-Cosmetics /partner/*, 전 서비스 redirect residue |
| 선행 IR | IR-O4O-DEADCODE-PHASE1, IR-O4O-DEADCODE-PHASE3-HOLD-AND-REDIRECT-CONSOLIDATION-AUDIT-V1 |

---

## 전 서비스 Navigate/redirect-only 라우트 현황

| 서비스 | Navigate 전용 라우트 수 | 비고 |
|--------|----------------------|------|
| web-kpa-society | **61개** | /pharmacy/* (24개) 포함 |
| web-neture | **31개** | /workspace/* 호환 레이어 포함 |
| web-glycopharm | **2개** | signage 경로 통합 2건 |
| web-k-cosmetics | **0개** | 가장 클린한 구조 |
| **합계** | **94개** | |

---

## 1. KPA-Society `/demo/*` 잔재

### 1-A. 실제 현황

| 항목 | 수치/내용 |
|------|-----------|
| `DemoLayoutRoutes()` 함수 규모 | App.tsx 77줄 (lines 1042–1118) |
| /demo/* 전용 라우트 수 | 8개 상위 route (admin/*, intranet/*, catch-all 포함) |
| DemoLayout import 위치 | App.tsx 단독 — 다른 파일 import 없음 |
| 실제 진입 링크 수 | **2곳** |
| DashboardPage API 호출 | **0건** — 순수 mock 데이터 |

### 1-B. 실제 진입 링크 2곳

| 파일 | 위치 | 링크 내용 |
|------|------|-----------|
| `src/components/platform/PlatformFooter.tsx` | line 23 | `<a href="/demo">약사회 서비스 (Demo)</a>` |
| `src/pages/admin/KpaOperatorDashboardPage.tsx` | line 178 | Quick Action: "이벤트/특가 관리" → `/demo/intranet/event-offers` |

> PlatformFooter의 링크 레이블 자체가 "Demo"이며, KpaOperatorDashboard Quick Action은 `/demo/intranet/event-offers`로 연결된다.
> 두 링크 모두 "현재 운영 기능"이 아닌 "demo 서비스용 진입"이다.

### 1-C. /demo/* 전용 페이지 컴포넌트 (삭제 후보)

아래는 DemoLayoutRoutes 내에서만 사용되며 메인 라우터에는 없는 컴포넌트들이다.

| 컴포넌트 | 용도 |
|----------|------|
| `DashboardPage` | /demo 홈 — mock 데이터 전용 |
| `NewsListPage`, `NewsDetailPage`, `GalleryPage` | /demo/news/* |
| `ForumHomePage`, `ForumListPage`, `ForumDetailPage`, `ForumWritePage`, `ForumFeedPage` | /demo/forum/* (메인 /forum과 별도) |
| `LmsCoursesPage`, `LmsCourseDetailPage`, `LmsLessonPage`, `LmsCertificatesPage` | /demo/lms/* |
| `ParticipationListPage` ~ `ParticipationResultPage` | /demo/participation/* |
| `EventOfferDetailPage`, `EventOfferHistoryPage` | /demo/event-offers/* |
| `MyDashboardPage`, `PersonalStatusReportPage`, `AnnualReportFormPage` | /demo/mypage/* |
| `EventsHomePage` | /demo/events |
| `MemberApplyPage`, `MyApplicationsPage` | /demo/member, /demo/applications (legacy) |

**총 20+ 컴포넌트가 /demo/* 전용**

### 1-D. 삭제 시 영향 범위

| 항목 | 영향 | 조치 |
|------|------|------|
| `DemoLayout.tsx` | App.tsx 단독 import → 파일 삭제 가능 | 삭제 |
| `PlatformFooter.tsx` | "/demo" 링크 제거 필요 | 링크 제거 또는 실 서비스 URL 교체 |
| `KpaOperatorDashboardPage.tsx` | Quick Action 1개 제거 | line 178 항목 삭제 |
| `ServiceContext.tsx` | `/demo*` pathname 감지 분기 | 분기 로직 제거 |
| `App.tsx` | DemoLayoutRoutes 함수 + 8개 route | 삭제 |
| /demo 전용 page 파일 20+ | 파일 삭제 가능 | 삭제 |

### 1-E. smoke test 필요 영역

- PlatformFooter 렌더링 정상 여부
- KpaOperatorDashboard Quick Action 블록 렌더링 (line 178 항목 제거 후)
- `/intranet/*` → `/demo/intranet` backward-compat redirect (App.tsx line 727) — /demo 삭제 시 `/intranet/*`도 제거 또는 신규 대상으로 교체 필요

### 1-F. 판정

**DELETE READY**

- 코드 자체에 "삭제 대상" 명시 (`⚠️ 삭제 대상`)
- 독립 도메인 기준 외에도 현재 실질적인 운영 기능 없음 (DashboardPage = mock 전용)
- 삭제 전 처리 필요: PlatformFooter 링크 + KpaOperatorDashboard Quick Action + ServiceContext 분기

---

## 2. KPA-Society `/pharmacy/*` Redirect Chain

### 2-A. 실제 현황

| 항목 | 내용 |
|------|------|
| /pharmacy/* 전체 라우트 수 | 25개 |
| 실제 페이지 라우트 | 2개 (`/pharmacy`, `/pharmacy/approval`) |
| Navigate redirect 전용 | **23개** |
| 메뉴/nav에서 /pharmacy/* 링크 | **0개** |
| 외부 하드코딩 링크 | **0개** |
| 모든 redirect 목적지 | /store/* 또는 /store-hub |

### 2-B. 23개 redirect 목적지 분포

| 목적지 | 건수 |
|--------|------|
| `/store/settings` 계열 | 3건 |
| `/store/content/blog` | 3건 |
| `/store/settings/template` | 2건 |
| `/store/settings/layout` | 2건 |
| `/store/products/suppliers` | 2건 |
| `/store/products/b2c` | 2건 |
| `/store/products` | 2건 |
| `/store/channels/tablet` | 2건 |
| `/store` | 2건 |
| `/store/content` | 1건 |
| `/store/channels` | 1건 |
| `/store-hub` | 1건 |

**전원 /store/* 계열 수렴 — 예외 없음**

### 2-C. Wildcard 통합 안전성

| 검토 항목 | 결과 |
|----------|------|
| 메뉴/외부에서 /pharmacy/* 직접 링크 | **없음** |
| /store/* 경로 충돌 가능성 | **없음** |
| 실제 페이지 2개 유지 필요 | `/pharmacy`, `/pharmacy/approval` |
| wildcard 적용 시 세부 경로 소실 | 허용 가능 (외부 링크 없음) |

> `/pharmacy/*`는 단일 wildcard로 `/store`로 향하면 충분하다.
> 세부 경로별 세밀한 redirect가 필요하다면 helper 함수 1개로 통합 가능하나,
> 현재 외부 접근이 없으므로 단순 wildcard로도 충분하다.

### 2-D. 판정

**WILDCARD CONSOLIDATION → 이후 DELETE**

- 1단계: 23개 → wildcard 1개 (`/pharmacy/*` → `/store`) 통합
- 2단계: 일정 기간 후 `/pharmacy`, `/pharmacy/approval`도 접근 필요 여부 재검토
- `/pharmacy` 실제 페이지 (`PharmacyPage`) 는 gate/approval 플로우용 — 현재 store 진입 전처리 역할인지 확인 후 처리

---

## 3. K-Cosmetics `/partner/*` Dashboard

### 3-A. 실제 현황

| 항목 | 내용 |
|------|------|
| 라우트 수 | 6개 (index + 5 dashboard) |
| 역할 게이트 | `allowedRoles={['k-cosmetics:partner']}` |
| 페이지 구현 상태 | 전원 구현 완료 (partnerApi 연결) |
| 메뉴 노출 조건 | `visibleWhen: 'partner'` — 역할 보유자만 노출 |
| PartnerLayout import 위치 | **App.tsx 단독** |
| 현재 partner 역할 운영 여부 | **미운영** (사업 흐름 없음) |

### 3-B. 삭제 시 영향 분석

| 항목 | 영향 | 판단 |
|------|------|------|
| PartnerLayout | App.tsx 단독 import → 삭제 가능 | 삭제 |
| 5개 dashboard 페이지 | partnerApi 호출 — backend orphaned | frontend 삭제, backend는 별도 판단 |
| partnerApi.ts (frontend) | 삭제 가능 | 삭제 |
| navigation.ts `/partner` 항목 | 역할 게이트로 숨겨져 있어 현재 미노출 | 항목 제거 |
| **PartnerInfoPage** (`/partners`) | **별도 public 페이지 — 생존** | 유지 |
| **PartnerApplyPage** (`/partners/apply`) | **별도 public 페이지 — 생존** | 유지 |
| backend partnerApi 엔드포인트 | frontend 제거 후 orphan | 별도 WO 처리 |

> `/partners` (공개 소개 페이지)와 `/partners/apply` (가입 신청)는 `/partner/*` dashboard와 별도 경로이며 인증 불필요. 삭제 영향 없음.

### 3-C. smoke test 필요 영역

- navigation.ts `/partner` 항목 제거 후 header 렌더링
- PartnerLayout 삭제 후 App.tsx import 정리

### 3-D. 판정

**DELETE READY**

- 현재 `k-cosmetics:partner` 역할 미운영
- 역할 게이트로 일반 사용자에게 노출 안 됨
- 페이지 구현은 완성이나 현재 사업 흐름 없음
- 삭제해도 `/partners`, `/partners/apply` public 페이지 영향 없음
- backend partner endpoint는 별도 WO에서 처리

---

## 4. 전 서비스 Legacy Redirect Residue

### 4-A. KPA-Society — 61개 Navigate 라우트

**주요 클러스터:**

| 클러스터 | 건수 | 내용 |
|----------|------|------|
| `/pharmacy/*` → `/store/*` | 23개 | 역할 명칭 전환 잔재 |
| `/demo/*` 관련 | 8개 | 데모 서비스 라우트 |
| `/intranet/*` → `/demo/intranet` | 1개 | backward-compat |
| `/content/*` legacy | 3개 | WO-KPA-CONTENT-HUB-REMOVAL-V1 |
| `/groupbuy`, `/dashboard`, `/select-function` | 3개 | 개별 구 경로 |
| `/news/*` (main scope) | 3개 | 전부 `/` 또는 NewsIdRedirect |
| 기타 legacy compat | ~20개 | mypage, store, hub 등 통합 후 잔재 |

**삭제 가능 즉시 후보 (메뉴/외부 링크 없는 것):**
- `/news` (main scope 3개) — Navigate to `/`
- `/groupbuy` — Navigate to `/store-hub/event-offers`
- `/dashboard` — Navigate to `/mypage`
- `/select-function` — Navigate to `/setup-activity`
- `/content/news`, `/content/new/quiz` 등 content hub cleanup 잔재

### 4-B. Neture — 31개 Navigate 라우트

**주요 클러스터:**

| 클러스터 | 건수 | 내용 |
|----------|------|------|
| `/workspace/operator/*` → `/operator/*` | 1개 (wildcard) | WO-O4O-NETURE-ROUTE-UNIFICATION-BIG-SWITCH-V1 |
| `/workspace/suppliers/:slug` | 1개 | RedirectSupplierDetail → Navigate to `/` |
| `/workspace/content/:id` | 1개 | RedirectContentDetail |
| `/workspace/admin-market-trial/:id` | 1개 | RedirectAdminMarketTrialDetail |
| `/manual/*`, `/channel/*` → `/o4o/*` | 8개 | 구 문서 경로 |
| `/about`, `/my`, `/partner/product-pool` 등 | 5개 | 개별 구 경로 |
| 기타 workspace 관련 | ~14개 | /workspace/* compat |

**삭제 가능 즉시 후보:**
- `RedirectSupplierDetail` (Navigate to `/`) — 공급자 상세 삭제됨
- `/manual/*`, `/channel/*` redirect 8개 — 구 문서 경로
- `/about`, `/my`, `/partner/product-pool`, `/partner/referrals` — 개별 구 경로

### 4-C. GlycoPharm — 2개 Navigate 라우트

- `/store/signage` → `playlist` (index redirect) — 기능적으로 필요
- `/signage` → `/store/signage/library` (WO-O4O-GLYCOPHARM-SIGNAGE-STRUCTURE-ALIGNMENT-TO-KPA-V1)

**판정: HOLD** — 현재도 유효한 signage 경로 통합 redirect

### 4-D. K-Cosmetics — 0개 Navigate 라우트

가장 클린한 구조. 별도 조치 불필요.

---

## 5. 종합 결과 테이블

| 서비스 | residue 항목 | 상태 | 실제 사용 여부 | 삭제 위험도 | 권장 작업 |
|--------|------------|------|------------|---------|---------|
| KPA | `/demo/*` 블록 전체 | LEGACY | 미사용 (mock-only) | MEDIUM | **DELETE** |
| KPA | DemoLayout.tsx | LEGACY | App.tsx 단독, /demo 제거 시 불필요 | LOW | **DELETE** |
| KPA | PlatformFooter `/demo` 링크 | LEGACY | "Demo" 레이블 그대로 노출 | LOW | **DELETE** (링크 제거) |
| KPA | KpaOperatorDashboard Quick Action `/demo/intranet/event-offers` | LEGACY | /demo로 연결 | LOW | **DELETE** (항목 제거) |
| KPA | /demo 전용 page 20+개 | LEGACY | DemoLayoutRoutes 내 전용 | LOW | **DELETE** |
| KPA | `/pharmacy/*` redirect 23개 | LEGACY | 메뉴/외부 링크 없음 | LOW | **CONSOLIDATE** → wildcard 1개 |
| KPA | `/news` main scope 3개, `/groupbuy`, `/dashboard` 등 | LEGACY | Navigate only | LOW | **DELETE** |
| K-Cosmetics | `/partner/*` dashboard (6 routes) | 미운영 | role 미할당 | MEDIUM | **DELETE** |
| K-Cosmetics | PartnerLayout.tsx | 미운영 | App.tsx 단독 | LOW | **DELETE** |
| K-Cosmetics | navigation.ts `/partner` 항목 | 미운영 | 역할 게이트로 미노출 | LOW | **DELETE** (항목 제거) |
| K-Cosmetics | partnerApi.ts (frontend) | 미운영 | partner pages만 사용 | LOW | **DELETE** |
| Neture | `RedirectSupplierDetail` + route | LEGACY | Navigate to `/` | LOW | **DELETE** |
| Neture | `/manual/*`, `/channel/*` → `/o4o/*` 8개 | LEGACY | 구 문서 경로 | LOW | **DELETE** |
| Neture | `/about`, `/my`, `/partner/product-pool` 등 | LEGACY | 구 경로 | LOW | **DELETE** |
| GlycoPharm | signage redirect 2개 | ACTIVE | 현재 유효한 경로 통합 | - | HOLD |

---

## 6. 결론

### A. 즉시 삭제 가능한 residue

**총 DELETE READY 항목: Route ~50개, File 20+개, Component 2개, Link 2개**

#### 최우선 (LOW risk, 영향 없음):
| 항목 | 위치 | 내용 |
|------|------|------|
| `/news` main scope 3개 | KPA App.tsx | Navigate to `/` |
| `/groupbuy`, `/dashboard`, `/select-function` | KPA App.tsx | Navigate redirect |
| `/content/news`, `/content/new/quiz` | KPA App.tsx | Navigate redirect |
| `RedirectSupplierDetail` + route | Neture App.tsx | Navigate to `/` |
| `/manual/*`, `/channel/*` 8개 | Neture App.tsx | 구 문서 경로 |
| `/about`, `/my`, `/partner/product-pool`, `/partner/referrals` | Neture App.tsx | 개별 구 경로 |

#### 연관 파일 함께 삭제:
| 항목 | 위치 |
|------|------|
| K-Cosmetics `/partner/*` 6개 route + PartnerLayout + partnerApi.ts + 5개 page 파일 | web-k-cosmetics |
| KPA `/demo/*` 블록 + DemoLayout + 20+ page 파일 + PlatformFooter 링크 + Dashboard Quick Action | web-kpa-society |

---

### B. Wildcard 통합 가능한 redirect

**KPA `/pharmacy/*` 23개 → wildcard 1개**

```typescript
// 유지 (실제 페이지):
<Route path="/pharmacy" element={<PharmacyPage />} />
<Route path="/pharmacy/approval" element={<PharmacyApprovalGatePage />} />

// 통합 (23개 → 1개):
<Route path="/pharmacy/*" element={<Navigate to="/store" replace />} />
```

안전 조건: 메뉴/외부 링크 없음 확인 완료

---

### C. Route는 남았지만 business flow가 사라진 구조

| 항목 | 상태 |
|------|------|
| K-Cosmetics `/partner/*` dashboard | role 미운영. 역할 할당자 없음. 페이지는 완성이나 업무 흐름 없음. |
| KPA `/demo/*` | 운영 기능 없음. DashboardPage는 mock 전용. 코드에 "삭제 대상" 명시. |
| KPA `/pharmacy/*` redirect | canonical 구조는 /store/*. /pharmacy/*는 구 명칭 잔재. |
| Neture `RedirectSupplierDetail` | 공급자 상세 삭제 완료. Navigate to `/` 만 남음. |

---

### D. 삭제 시 smoke test 필요 영역

| 삭제 항목 | smoke test 대상 |
|----------|----------------|
| KPA `/demo/*` 삭제 | PlatformFooter 렌더링 / KpaOperatorDashboard Quick Action 블록 / `/intranet/*` redirect 처리 |
| KPA `/pharmacy/*` wildcard 통합 | `/pharmacy`, `/pharmacy/approval` 실제 페이지 접근 / `/store` 정상 도달 |
| K-Cosmetics `/partner/*` 삭제 | KCosGlobalHeader 렌더링 / `/partners` 공개 소개 페이지 / `/partners/apply` 가입 신청 |
| Neture redirect 제거 | `/` 홈 정상 / 기존 workspace URL 직접 접근 시 404 처리 확인 |

---

### E. 삭제하면 안 되는 항목

| 항목 | 이유 |
|------|------|
| GlycoPharm signage redirect 2개 | 현재 유효한 signage 경로 통합 |
| KPA `/pharmacy`, `/pharmacy/approval` | 실제 동작 페이지 — gate/approval 플로우 확인 필요 |
| K-Cosmetics `/partners` (public 소개) | 별도 경로, /partner/* 삭제와 무관 |
| K-Cosmetics `/partners/apply` (public 신청) | 별도 경로, 생존 |
| GlycoPharm `/service/*` | Phase 1 완성 구현, backend 연결 — 별도 WO 처리 |
| Neture `/workspace/partners/*` | ACTIVE 사용 (PartnershipRequest 기능) |

---

## 7. Phase 4 WO 권고

### 즉시 가능 (선행 조건 없음)

| WO | 대상 | 범위 |
|----|------|------|
| WO-O4O-DEADCODE-PHASE4-KPA-PHARMACY-WILDCARD-V1 | KPA /pharmacy/* | 23개 → wildcard 1개 |
| WO-O4O-DEADCODE-PHASE4-NETURE-REDIRECT-CLEANUP-V1 | Neture redirect residue | ~15개 route + 4개 helper 함수 |
| WO-O4O-DEADCODE-PHASE4-KPA-INDIVIDUAL-REDIRECT-CLEANUP-V1 | KPA 개별 redirect | /news, /groupbuy, /dashboard 등 9개 |

### 연관 파일 함께 처리 (일괄 삭제 WO)

| WO | 대상 | 범위 |
|----|------|------|
| WO-O4O-DEADCODE-PHASE4-KPA-DEMO-BLOCK-REMOVAL-V1 | KPA /demo/* 전체 | App.tsx block + DemoLayout + 20+ pages + 2개 링크 + ServiceContext 분기 |
| WO-O4O-DEADCODE-PHASE4-KCOS-PARTNER-DASHBOARD-REMOVAL-V1 | K-Cosmetics /partner/* | 6 routes + PartnerLayout + partnerApi + 5 pages + nav 항목 |

---

*IR 작성: 2026-05-15*
*선행 IR: IR-O4O-DEADCODE-PHASE1-ROUTE-MENU-ORPHAN-AUDIT-V1, IR-O4O-DEADCODE-PHASE3-HOLD-AND-REDIRECT-CONSOLIDATION-AUDIT-V1*
*다음 단계: WO-O4O-DEADCODE-PHASE4-* (5개 WO)*
