# IR-O4O-DEADCODE-PHASE3-HOLD-AND-REDIRECT-CONSOLIDATION-AUDIT-V1

> **조사 전용 문서 — 삭제·수정·리팩토링 작업 없음**
>
> Phase 1(IR-O4O-DEADCODE-PHASE1)에서 HOLD로 분류된 항목들의 실제 상태를 재조사한 결과이다.
> 실제 삭제·통합 작업은 Phase 4 WO에서 별도 진행한다.

---

## 조사 메타

| 항목 | 내용 |
|------|------|
| 조사 일자 | 2026-05-15 |
| 조사 항목 | KPA /demo/*, KPA /pharmacy/* chain, GlycoPharm /service/*, K-Cosmetics /partner/* |
| 조사 방법 | App.tsx 전수 분석 + 페이지 파일 직접 읽기 + 백엔드 API 존재 확인 + 메뉴/링크 교차확인 |
| 선행 IR | IR-O4O-DEADCODE-PHASE1-ROUTE-MENU-ORPHAN-AUDIT-V1 |

---

## 1. KPA-Society `/demo/*` 블록

### 1-A. 현황 요약

| 항목 | 내용 |
|------|------|
| 라우트 수 | 8개 (login, register, register/pending, select-function, admin/*, operator/*, intranet/*, catch-all) |
| 삭제 조건 주석 | "실제 지부/분회 서비스가 독립 도메인으로 제공되면 전체 삭제 대상" |
| 조건 충족 여부 | **미충족** — 독립 도메인 서비스 아직 미출시 |
| DashboardPage API 호출 | **0건** — 순수 mock 데이터 (mockUser, mockOfficerData, quickMenuItems) |

### 1-B. `/demo/*` 링크 존재 파일 (5개)

| 파일 | 링크 내용 | 성격 |
|------|-----------|------|
| `src/App.tsx` | route 정의 6개 + `/demo/intranet` backward-compat | 라우터 정의 |
| `src/components/DemoLayout.tsx` | DemoLayoutRoutes에서 사용 | Layout wrapper |
| `src/contexts/ServiceContext.tsx` | `/demo*` pathname 감지 | 서비스 컨텍스트 분기 |
| `src/components/platform/PlatformFooter.tsx` | `<a href="/demo">약사회 서비스 (Demo)</a>` | **노출된 진입점** |
| `src/pages/admin/KpaOperatorDashboardPage.tsx` | Link to `/demo/intranet/event-offers` | **Admin 대시보드 링크** |

### 1-C. DemoLayout 사용 범위

- `DemoLayout`은 `App.tsx`의 `DemoLayoutRoutes()` 함수 내에서만 사용
- 별도 파일에서 import 없음
- DemoLayout 내부 배너: *"이 서비스는 지부/분회 홈페이지의 예시 화면입니다. 실제 지부/분회 서비스는 별도 도메인에서 운영됩니다."*
- `DemoHeader.tsx`는 코드 주석에 "더 이상 사용하지 않음" 명시

### 1-D. KPA-b / KPA-c 구조와의 관계

- `/demo/*` 전용 페이지는 별도로 존재하지 않음
- `/demo/news/*`, `/demo/forum/*`, `/demo/lms/*` 등은 메인 앱의 페이지 컴포넌트를 공유
- `/demo/admin/*`은 `AdminRoutes` 컴포넌트를 재사용
- `/demo/operator/*` → `/operator`로 redirect (실체 없음)
- KPA-b/c 구조는 공통 컴포넌트 위에서 서비스 컨텍스트(ServiceContext)로 분기

### 1-E. 판정

**HOLD**

- 삭제 조건(독립 도메인 서비스 출시)이 아직 충족되지 않음
- PlatformFooter와 KpaOperatorDashboardPage에 실제 진입 링크 존재 — 갑작스러운 삭제 시 UX 깨짐
- DashboardPage는 mock 데이터 전용이지만, `/demo/intranet/*`, `/demo/admin/*` 하위 페이지는 실제 API 호출 가능성 있음
- 삭제 시 연동 제거 필요 파일: `DemoLayout.tsx`, `PlatformFooter.tsx` (링크), `KpaOperatorDashboardPage.tsx` (링크), `ServiceContext.tsx` (감지 분기), `DemoLayoutRoutes()` 함수

---

## 2. KPA-Society `/pharmacy/*` Redirect Chain

### 2-A. 현황 요약

| 항목 | 내용 |
|------|------|
| 총 /pharmacy/* 라우트 수 | 25개 |
| 실제 페이지 라우트 | 2개 (`/pharmacy` PharmacyPage, `/pharmacy/approval` PharmacyApprovalGatePage) |
| redirect 전용 라우트 | 23개 |
| 메뉴/nav에서 /pharmacy/* 링크 | **0개** |
| 외부 하드코딩 링크 | **0개** |

### 2-B. 23개 Redirect 라우트 전체 목록

| 경로 | 리다이렉트 대상 |
|------|----------------|
| `/pharmacy/dashboard` | `/store` |
| `/pharmacy/hub` | `/store-hub` |
| `/pharmacy/store` | `/store` |
| `/pharmacy/store/layout` | `/store/settings/layout` |
| `/pharmacy/store/template` | `/store/settings/template` |
| `/pharmacy/store/blog` | `/store/content/blog` |
| `/pharmacy/store/tablet` | `/store/channels/tablet` |
| `/pharmacy/store/channels` | `/store/channels` |
| `/pharmacy/store/cyber-templates` | `/store/settings` |
| `/pharmacy/assets` | `/store/content` |
| `/pharmacy/settings` | `/store/settings` |
| `/pharmacy/sales/b2b` | `/store/products` |
| `/pharmacy/sales/b2b/suppliers` | `/store/products/suppliers` |
| `/pharmacy/sales/b2c` | `/store/products/b2c` |
| `/pharmacy/services` | `/store/settings` |
| `/pharmacy/b2b` | `/store/products` |
| `/pharmacy/b2b/suppliers` | `/store/products/suppliers` |
| `/pharmacy/sell` | `/store/products/b2c` |
| `/pharmacy/tablet-requests` | `/store/channels/tablet` |
| `/pharmacy/blog` | `/store/content/blog` |
| `/pharmacy/kpa-blog` | `/store/content/blog` |
| `/pharmacy/template` | `/store/settings/template` |
| `/pharmacy/layout-builder` | `/store/settings/layout` |

**리다이렉트 목적지 분포:**
- `/store` 계열: 22개
- `/store-hub`: 1개
- **예외 없음 — 전원 /store 계열로 수렴**

### 2-C. Wildcard 통합 안전성 분석

| 검토 항목 | 결과 |
|----------|------|
| 모든 redirect가 /store 계열로 수렴? | **YES** |
| /store/* 라우트와 path 충돌 가능성 | **없음** |
| 메뉴/nav에서 /pharmacy/* 직접 링크 | **0개** |
| 외부 하드코딩 링크 | **0개** |
| 통합 시 유지해야 할 명시 route | `/pharmacy` (PharmacyPage), `/pharmacy/approval` (PharmacyApprovalGatePage) |

**wildcard 통합 가능 조건 충족 ✅**

단, 다음 순서로 정의해야 충돌 없음:
```typescript
<Route path="/pharmacy" element={<PharmacyPage />} />           // 1순위: 실제 페이지
<Route path="/pharmacy/approval" element={<.../>} />             // 2순위: 실제 페이지
<Route path="/pharmacy/*" element={<Navigate to="/store" replace />} /> // 3순위: wildcard
```

> **주의**: sub-path별로 서로 다른 /store/* 경로로 분기되므로, 단순 wildcard 통합 시 세부 경로 정보는 소실된다.
> 이는 허용 가능한 trade-off — 이미 /pharmacy/* 경로는 메뉴/외부 링크가 없으므로 북마크 사용자가 존재한다면 `/store` 홈으로 떨어지게 된다.
> 세부 경로 보존이 필요하다면 단일 wildcard 대신 아래 방식도 가능:
> ```typescript
> <Route path="/pharmacy/*" element={<PharmacyWildcardRedirect />} />
> // 내부에서 subpath를 /store로 매핑하는 간단한 함수
> ```

### 2-D. 판정

**CONSOLIDATE**

- 23개 개별 route → wildcard 1개 (`/pharmacy/*`) 또는 핵심 2-3개로 통합 가능
- 메뉴/외부 링크 없음 — 세부 경로 소실 영향 최소
- 실제 페이지 2개(`/pharmacy`, `/pharmacy/approval`)는 반드시 유지

---

## 3. GlycoPharm `/service`, `/service-login`, `/service/dashboard`

### 3-A. 현황 요약

| 항목 | 내용 |
|------|------|
| WO | WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM |
| 현재 Phase | Phase 1 구현 완료, Phase 2 진행 예정 |
| Frontend 구현 | **완성** (ServiceLoginPage + ServiceDashboardPage) |
| Backend API 구현 | **완성** (service auth routes + service-user service) |
| 메뉴/nav 노출 | **없음** — 직접 URL 또는 redirect로만 접근 |

### 3-B. 페이지 구현 상태

**ServiceLoginPage** (`pages/auth/ServiceLoginPage.tsx`):
- OAuth provider 버튼 UI (Google, Kakao, Naver) 구현 완료
- `/api/v1/auth/service/login` API 호출 완료
- serviceId: 'glycopharm' 전달
- Phase 1: JSON-encoded OAuth 테스트 프로필 방식

**ServiceDashboardPage** (`pages/service/ServiceDashboardPage.tsx`):
- 인증된 서비스 사용자 프로필 표시 완료
- /forum, /education, / 빠른 링크
- 로그아웃 기능
- AuthContext에서 서비스 사용자 컨텍스트 로드

### 3-C. 백엔드 API 구현 상태

| 엔드포인트 | 상태 |
|------------|------|
| `POST /api/v1/auth/service/login` | **구현 완료** |
| `POST /api/v1/auth/service/refresh` | **구현 완료** |
| `GET /api/v1/auth/service/me` | **구현 완료** |
| `GET /api/v1/auth/service/status` | **구현 완료** |

- Service JWT 토큰(`tokenType: 'service'`) 분리 발급
- `requireServiceUser` middleware 구현
- Phase 2 TODO: 실제 OAuth provider validation (현재 스텁)

### 3-D. 메뉴/링크 노출 여부

- 어떤 sidebar, header, 메뉴에도 `/service`, `/service-login` 링크 없음
- ServiceUserProtectedRoute를 통한 자동 redirect 또는 직접 URL만으로 접근 가능
- 일반 사용자에게 노출된 진입점 없음

### 3-E. 판정

**HOLD UNTIL AUTH PHASE2**

- Phase 1 구현은 완료 상태 — 스텁이 아니라 실제 동작하는 코드
- 삭제 금지 — 백엔드 API 및 프론트엔드 플로우가 연결되어 있음
- Phase 2(실제 OAuth provider validation) 완료 후 production 활성화 예정
- 현재 메뉴 비노출은 의도적 — Phase 2 완료 전 일반 사용자 접근 차단

---

## 4. K-Cosmetics `/partner/*`

### 4-A. 현황 요약

| 항목 | 내용 |
|------|------|
| 라우트 수 | 5개 (index, overview, targets, content, events, status) |
| 역할 게이트 | `ProtectedRoute allowedRoles={['k-cosmetics:partner']}` |
| 페이지 구현 상태 | **전원 구현 완료** (API 연결 포함) |
| 메뉴/nav 노출 | **있음** — navigation.ts에 'partner' 항목 정의 |
| 역할 정의 여부 | **있음** — backend migration에 정의됨 |

### 4-B. 페이지별 구현 상태

| 페이지 | 파일 | 구현 상태 | API |
|--------|------|-----------|-----|
| Partner Index | `pages/partner/index.tsx` | `/partner/overview` redirect | - |
| OverviewPage | `pages/partner/OverviewPage.tsx` | **구현 완료** | `partnerApi.getOverview()` |
| TargetsPage | `pages/partner/TargetsPage.tsx` | **구현 완료** | `partnerApi.getTargets()` |
| ContentPage | `pages/partner/ContentPage.tsx` | **구현 완료** (CRUD) | `partnerApi.getContents()` |
| EventsPage | `pages/partner/EventsPage.tsx` | **구현 완료** | `partnerApi.getEvents()` |
| StatusPage | `pages/partner/StatusPage.tsx` | **구현 완료** | `partnerApi.getStatus()` |

### 4-C. 메뉴/nav 노출

- `src/config/navigation.ts`: `{ label: '파트너', href: '/partner', visibleWhen: 'partner' }` 정의
- `KCosGlobalHeader`에서 역할 기반 필터(`filterContextualNav()`)로 partner 역할 보유 시 표시
- Admin/Operator는 전체 nav 노출; Partner는 '/partner' 링크만 노출

### 4-D. 역할 정의

- Backend migration `20260331500000-UnifyCosmeticsRolesCatalog.ts`에 'partner' 역할 정의됨
- 이전 명칭: 'cosmetics:partner' → 현재: 'partner' (k-cosmetics 서비스 스코프에서 사용)
- 테스트 계정: `partner@neture.test` (migration `1737100300000`에서 역할 고정)

### 4-E. PartnerLayout

- `components/layouts/PartnerLayout.tsx` 구현 완료
- 5개 사이드바 메뉴: 요약, 홍보 대상, 콘텐츠, 이벤트 조건, 상태
- 모바일 오버레이 + 데스크톱 고정 레이아웃
- `KCosGlobalHeader` 통합

### 4-F. 판정

**KEEP**

- 모든 페이지 실제 API 연결된 완성 구현체
- 네비게이션 정상 노출 및 역할 게이트 작동
- 백엔드 역할 정의 및 테스트 계정 존재
- WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1 진행 중
- 판매자-파트너 계약 생태계의 핵심 기능

---

## 5. 종합 결과 테이블

| 서비스 | 항목 | 현재 상태 | 근거 | 권장 판정 | 다음 WO 필요 여부 |
|--------|------|-----------|------|-----------|-------------------|
| KPA-Society | `/demo/*` 블록 전체 | 삭제 조건 미충족. 진입 링크 2곳 존재. 일부 페이지는 실제 API 호출. | 독립 도메인 미출시. PlatformFooter + KpaOperatorDashboard에 링크. | **HOLD** | YES — SVC-B 출시 WO와 연계 |
| KPA-Society | `/pharmacy/*` redirect chain 23개 | 전원 /store 계열 수렴. 메뉴/외부 링크 0개. | wildcard 통합 안전성 확인됨. 실제 페이지 2개는 유지. | **CONSOLIDATE** | YES — Phase 4 WO (route 수정) |
| GlycoPharm | `/service`, `/service-login`, `/service/dashboard` | Phase 1 구현 완료. 백엔드 API 완성. 메뉴 미노출(의도적). | Phase 2 OAuth 미완. 삭제 시 기구현 플로우 파괴. | **HOLD UNTIL AUTH PHASE2** | YES — WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM 완료 후 |
| K-Cosmetics | `/partner/*` (5 routes) | 전 페이지 구현 완료. nav 노출. 역할 정의. 테스트 계정. | WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1 진행 중. | **KEEP** | NO (ongoing WO 있음) |

---

## 6. 결론

### A. 지금 즉시 삭제 가능한 항목

**없음.**

이번 Phase 3 재조사 대상 4개 항목 중 즉시 삭제 가능한 항목은 없다.

---

### B. Wildcard 통합 가능한 항목

**KPA-Society `/pharmacy/*` redirect chain 23개 → wildcard 1개**

- 조건: `/pharmacy`, `/pharmacy/approval` 명시 route를 wildcard 앞에 배치
- 대상: 23개 개별 route → `<Route path="/pharmacy/*" element={<Navigate to="/store" replace />} />`
- 위험도: LOW
- **Phase 4 WO에서 처리 가능**

---

### C. 정책 확인 전까지 보류할 항목

**KPA-Society `/demo/*` 블록**
- 보류 조건: KPA SVC-B 독립 도메인 서비스 미출시
- 확인 필요 사항: SVC-B 독립 출시 일정
- 삭제 시 연동 제거 필요: `PlatformFooter.tsx`, `KpaOperatorDashboardPage.tsx`, `ServiceContext.tsx`

---

### D. Phase 4 작업으로 넘길 항목

| 항목 | Phase 4 작업 내용 | 선행 조건 |
|------|-------------------|-----------|
| KPA `/pharmacy/*` 통합 | 23개 route → wildcard 1개로 통합 | 없음 (즉시 가능) |
| KPA `/demo/*` 삭제 | DemoLayout, 진입 링크, 페이지 파일 일괄 제거 | SVC-B 독립 서비스 출시 |
| GlycoPharm `/service/*` 활성화 | Phase 2 OAuth 연동 완료 후 메뉴 노출 | WO-AUTH-SERVICE-IDENTITY-PHASE2-GLYCOPHARM |

---

### E. 삭제하면 안 되는 항목

| 항목 | 이유 |
|------|------|
| K-Cosmetics `/partner/*` (5 routes) | 완성된 구현체, 역할 정의, nav 노출, 진행 중 WO |
| GlycoPharm `/service`, `/service-login`, `/service/dashboard` | Phase 1 완성, 백엔드 API 연결, Phase 2 진행 예정 |
| KPA `/pharmacy`, `/pharmacy/approval` | 실제 동작하는 페이지 (redirect 아님) |
| KPA `/demo/*` | 삭제 조건 미충족 상태에서 강제 삭제 금지 |

---

## 7. Phase 4 WO 권고

### WO-O4O-DEADCODE-PHASE4-PHARMACY-WILDCARD-CONSOLIDATION-V1 (즉시 가능)

대상: `services/web-kpa-society/src/App.tsx`
작업: `/pharmacy/*` redirect 23개 → wildcard 1개
위험도: LOW
선행 조건: 없음

```typescript
// Before: 23개 개별 Navigate route
// After:
<Route path="/pharmacy" element={<PharmacyPage />} />
<Route path="/pharmacy/approval" element={<PharmacyApprovalGatePage />} />
<Route path="/pharmacy/*" element={<Navigate to="/store" replace />} />
```

### WO-O4O-DEADCODE-PHASE4-DEMO-BLOCK-REMOVAL-V1 (조건부)

대상: `services/web-kpa-society/src/` 다수 파일
조건: KPA SVC-B 독립 서비스 출시 완료 후
범위:
- `App.tsx` — DemoLayoutRoutes 함수 + /demo/* 라우트 블록 제거
- `components/DemoLayout.tsx` — 파일 삭제
- `components/platform/PlatformFooter.tsx` — /demo 링크 제거
- `pages/admin/KpaOperatorDashboardPage.tsx` — /demo/intranet/event-offers 링크 제거
- `contexts/ServiceContext.tsx` — /demo* 감지 분기 제거
- `/demo/*` 전용 page 파일 (IntranetRoutes 관련) 제거

---

*IR 작성: 2026-05-15*
*선행 IR: IR-O4O-DEADCODE-PHASE1-ROUTE-MENU-ORPHAN-AUDIT-V1*
*다음 단계: WO-O4O-DEADCODE-PHASE4-PHARMACY-WILDCARD-CONSOLIDATION-V1*
