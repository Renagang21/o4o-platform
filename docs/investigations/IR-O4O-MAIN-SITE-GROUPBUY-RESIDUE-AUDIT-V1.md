# IR-O4O-MAIN-SITE-GROUPBUY-RESIDUE-AUDIT-V1

> **조사 유형**: Legacy Residue Audit (Investigation Only — 코드 변경 없음)
> **대상 앱**: `apps/main-site`
> **작성일**: 2026-05-15
> **상태**: 완료

---

## 1. 조사 목적

`apps/main-site/src` 내 `groupbuy` 잔류 코드의 전체 현황을 파악한다.

- 파일 목록 및 역할 분류
- 라우트 등록 현황 (router.tsx)
- 네비게이션 노출 현황 (사용자 가시성)
- API 호출 경로 및 서버 등록 여부
- 서비스 정체성 판단 (KPA 전용 vs 플랫폼 공통)
- 삭제 후보 분류 및 리스크 평가

---

## 2. 파일 인벤토리

`apps/main-site/src` 내 `groupbuy` 문자열 포함 파일 (5개):

| # | 파일 경로 | 역할 | 비고 |
|---|-----------|------|------|
| 1 | `pages/groupbuy/GroupbuyListPage.tsx` | 공동구매 목록 페이지 | 캠페인 카드, 필터, 참여 버튼 |
| 2 | `pages/groupbuy/GroupbuyDetailPage.tsx` | 공동구매 상세 페이지 | 수량 선택, 가격 표시, 참여 API |
| 3 | `router/index.tsx` | 라우터 — 2개 Route 등록 | `/groupbuy`, `/groupbuy/:id` |
| 4 | `layouts/MainLayout.tsx` | 공통 레이아웃 — 네비게이션 | 상단 nav + footer 링크 노출 |
| 5 | `pages/dashboard/DashboardPage.tsx` | 대시보드 — stat 참조 | `groupbuyParticipations` + 퀵 링크 |

---

## 3. 라우트 등록 현황

**`apps/main-site/src/router/index.tsx`**

```tsx
// Groupbuy pages (lazy import)
const GroupbuyListPage = lazy(() => import('@/pages/groupbuy/GroupbuyListPage'));
const GroupbuyDetailPage = lazy(() => import('@/pages/groupbuy/GroupbuyDetailPage'));

// Route elements
<Route path="/groupbuy" element={<GroupbuyListPage />} />
<Route path="/groupbuy/:id" element={<GroupbuyDetailPage />} />
```

- 프론트엔드 라우트는 정상 등록됨 → 사용자가 `/groupbuy` URL 진입 시 페이지 렌더링 시도
- 단, 페이지가 호출하는 API 경로가 서버에 등록되지 않아 데이터 로딩 실패

---

## 4. 네비게이션 노출 현황

**`apps/main-site/src/layouts/MainLayout.tsx`**

```tsx
const navItems = [
  { label: '홈',     path: '/',        icon: '🏠' },
  { label: '커뮤니티', path: '/forum',   icon: '💬' },
  { label: '공동구매', path: '/groupbuy', icon: '🛒' },
  { label: '내 학습', path: '/lms',     icon: '📚' },
];
// footer:
<li><Link to="/groupbuy" className="hover:text-white">공동구매</Link></li>
```

**노출 범위**: 상단 글로벌 네비게이션 + 푸터 링크 — `main-site` 방문하는 모든 사용자에게 노출됨

---

## 5. API 호출 경로 및 서버 등록 여부

### GroupbuyListPage.tsx

| 호출 경로 | 메서드 | 서버 등록 여부 |
|-----------|--------|--------------|
| `/groupbuy/campaigns?organizationId=...&status=active` | GET | ❌ 미등록 |

### GroupbuyDetailPage.tsx

| 호출 경로 | 메서드 | 서버 등록 여부 |
|-----------|--------|--------------|
| `/groupbuy/campaigns/:id` | GET | ❌ 미등록 |
| `/groupbuy/campaigns/:id/my-participation` | GET | ❌ 미등록 |
| `/groupbuy/campaigns/:id/join` | POST | ❌ 미등록 |

### DashboardPage.tsx

| 호출 경로 | 메서드 | 서버 등록 여부 |
|-----------|--------|--------------|
| `/dashboard` | GET | 불명 (에러 시 default 0 데이터로 폴백) |

**근거**: `apps/api-server/src/bootstrap/register-routes.ts` 에 `/groupbuy/campaigns` 경로 없음. KPA 전용 Event Offer 경로(`/api/v1/kpa/groupbuy-admin/*`, `/api/v1/kpa/groupbuy/*`)와 구별됨.

---

## 6. 서비스 정체성 판단

`apps/main-site` 는 플랫폼 공통 프론트엔드로 판단됨:

- 4개 섹션 네비게이션: 홈 / 커뮤니티 / 공동구매 / 내 학습
- `forum`, `lms` 등 플랫폼 공통 구조와 동일한 섹션 구성
- 특정 서비스(`kpa-society`, `glycopharm` 등) 전용 브랜딩 없음
- KPA 전용 Event Offer(`/api/v1/kpa/groupbuy-admin/*`)와 완전히 분리된 별도 앱

**중요**: KPA Society의 공동구매 기능은 `apps/web-kpa-society` 앱이 담당하며, `main-site`의 groupbuy 코드와 무관함. `main-site`는 KPA 전용이 아닌 플랫폼 레벨 앱.

---

## 7. 삭제 후보 분류

### 7.1 HIGH 삭제 후보 (API Dead — 기능 불동작)

| 항목 | 경로 | 사유 |
|------|------|------|
| `GroupbuyListPage.tsx` | `pages/groupbuy/GroupbuyListPage.tsx` | API 미등록, 목록 로딩 불가 |
| `GroupbuyDetailPage.tsx` | `pages/groupbuy/GroupbuyDetailPage.tsx` | API 미등록, 상세/참여 불가 |

### 7.2 HIGH 삭제 후보 (Router/Nav — 진입점 제거)

| 항목 | 파일 | 제거 대상 |
|------|------|---------|
| Route 등록 | `router/index.tsx` | 2개 lazy import + 2개 `<Route>` |
| Nav 링크 | `layouts/MainLayout.tsx` | `navItems` 배열 `공동구매` 항목 + footer `<li>` |

### 7.3 LOW 수정 후보 (참조 정리)

| 항목 | 파일 | 처리 방안 |
|------|------|---------|
| `groupbuyParticipations` stat | `pages/dashboard/DashboardPage.tsx` | stat 항목 제거 + `/groupbuy` 퀵 링크 제거 |

> **참고**: `DashboardPage.tsx`의 `/dashboard` API 호출은 에러 시 default 0 값으로 폴백되어 현재도 동작함. `groupbuyParticipations` 필드 참조만 정리하면 됨.

---

## 8. 리스크 평가

| 항목 | 리스크 수준 | 설명 |
|------|------------|------|
| 페이지 삭제 | LOW | API가 이미 죽어 있어 실제 기능 없음. 삭제해도 기능 손실 없음 |
| 네비게이션 제거 | MEDIUM | 사용자 가시적 변경. 공동구매 링크 클릭 → 에러 페이지/빈 화면이 노출되던 상태 → 링크 제거 시 사용자 혼란 해소 |
| Dashboard stat 제거 | LOW | 폴백이 0 값이므로 현재도 정보가 없음. 필드 제거는 UI 정리 |
| Event Offer 영향 | NONE | `main-site`의 `/groupbuy/*`는 KPA의 `/api/v1/kpa/groupbuy*`와 완전히 분리됨 |

---

## 9. 보존 대상 (변경 금지)

다음은 이번 조사와 무관하게 절대 보존:

| 항목 | 위치 | 사유 |
|------|------|------|
| `eventOffer.ts` | `apps/web-kpa-society/` | KPA Event Offer 캐노니컬 |
| `eventOfferAdmin.ts` | `apps/web-kpa-society/` | KPA Event Offer Admin 캐노니컬 |
| `/api/v1/kpa/groupbuy-admin/*` | `kpa.routes.ts` | 등록된 KPA 라우트 |
| `/api/v1/kpa/groupbuy/*` | `kpa.routes.ts` | 등록된 KPA 라우트 |
| `SERVICE_KEYS.KPA_GROUPBUY` | `service-keys.ts` | OPL service_key 데이터 값 |

---

## 10. 후속 WO 후보

| WO 식별자 (제안) | 범위 | 우선순위 |
|----------------|------|---------|
| `WO-O4O-GROUPBUY-MAIN-SITE-CLEANUP-V1` | `pages/groupbuy/` 삭제 + router/nav 제거 + dashboard 정리 | HIGH |

**WO 범위 상세:**
1. `apps/main-site/src/pages/groupbuy/GroupbuyListPage.tsx` 삭제
2. `apps/main-site/src/pages/groupbuy/GroupbuyDetailPage.tsx` 삭제
3. `apps/main-site/src/router/index.tsx` — 2개 lazy import + 2개 `<Route>` 제거
4. `apps/main-site/src/layouts/MainLayout.tsx` — `navItems` 공동구매 항목 제거 + footer 링크 제거
5. `apps/main-site/src/pages/dashboard/DashboardPage.tsx` — `groupbuyParticipations` stat 제거 + 퀵 링크 제거

---

## 11. 조사 결론

`apps/main-site`의 groupbuy 잔류물은 **완전히 Dead Code**이다:

- 프론트엔드 라우트는 등록되어 있으나 모든 API 호출 경로(`/groupbuy/campaigns/*`)가 서버에 미등록
- 네비게이션(상단 nav + 푸터)에 `공동구매` 링크가 사용자에게 노출되지만 진입 시 빈 화면/에러 발생
- KPA Event Offer 캐노니컬 코드(`/api/v1/kpa/groupbuy*`)와 완전히 분리되어 있어 삭제 시 충돌 없음
- DashboardPage의 `groupbuyParticipations`는 이미 폴백 데이터로만 동작 중

**권고**: `WO-O4O-GROUPBUY-MAIN-SITE-CLEANUP-V1` 실행으로 5개 수정 항목 전부 삭제/제거. 삭제 후 TypeScript + build 검증 필수.

---

*Auditor: Claude Code*
*Audit Date: 2026-05-15*
*Status: COMPLETE — WO 실행 대기 중*
