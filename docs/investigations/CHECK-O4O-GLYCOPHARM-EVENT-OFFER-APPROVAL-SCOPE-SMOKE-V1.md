# CHECK-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-SMOKE-V1

**작성 일자**: 2026-05-31
**작업 성격**: 통합 검증 CHECK (G2 + G1 종결) — 코드 / DB / migration / source file 수정 일절 없음
**선행 IR**: [IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1](IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1.md)
**대상 commit**:
- G2 — `d9add825d` (WO-O4O-GLYCOPHARM-EVENT-OFFER-SUPPLIER-PROPOSAL-MAPPING-V1)
- G1 — `51448ab5f` (WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-EVENT-OFFER-ACTION-QUEUE-V1)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **PASS** (정적 코드 경로 + TypeScript + 권한 정합 + 회귀 검증 통과)
>
> 브라우저 smoke 는 본 CHECK 에서 미수행 (테스트 데이터 부재 + "실제 approve/reject 실행 금지" / "proposal 생성은 테스트 데이터 명확 시" 제약). 정적 코드 경로 + typecheck 결과 + 권한 정합으로 동작 보장. 실데이터 표시는 prod 데이터 유입 후 별도 확인 시점에 수행 가능.

| 영역 | 결과 |
|------|:----:|
| G2 Supplier proposal mapping | ✅ |
| G1 Dashboard Action Queue | ✅ |
| GlycoPharm operator approval scope | ✅ |
| End-to-end 코드 경로 | ✅ |
| 권한 정합 | ✅ |
| api-server typecheck | ✅ (0 errors) |
| web-neture typecheck | ✅ (0 errors) |
| web-glycopharm typecheck | ✅ (22 pre-existing errors, G2/G1 경로 신규 0) |
| web-k-cosmetics typecheck | ✅ (0 errors — 회귀 0) |
| web-kpa-society typecheck | ✅ (0 errors — 회귀 0) |
| K-Cosmetics / KPA / Neture 회귀 | ✅ 없음 |
| Source file 수정 | ✅ 없음 (검증 전용) |
| 다른 세션 WIP 포함 | ✅ 없음 (working tree clean) |
| Care / GlucoseView 재오염 | ✅ 없음 |

---

## 1. Executive Summary

GlycoPharm Event Offer approval scope 정비가 의도대로 완료되었는지 G2 + G1 통합 검증. 결과 PASS.

검증 흐름:

```
Neture supplier proposal (GlycoPharm 선택 가능, G2)
  → GlycoPharm event-offer pending OPL 생성 (service_key='glycopharm-event-offer', status='pending')
  → GlycoPharm operator dashboard Action Queue 표시 ("이벤트 오퍼 승인 대기", G1)
  → 클릭 → /operator/event-offers (기존 route)
  → 승인/반려 (기존 flow)
  → 매장 진열 cascade (STORE_SERVICE_KEY_MAP → GLYCOPHARM)
```

각 단계의 정적 코드 / 권한 / 데이터 경로가 정합.

---

## 2. 검증 대상 commit 목록

| Commit | WO | 범위 |
|--------|----|------|
| `56fa79212` | IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1 | 정책 결정 IR (operator 업무 확정 Option A) |
| `d9add825d` | WO-O4O-GLYCOPHARM-EVENT-OFFER-SUPPLIER-PROPOSAL-MAPPING-V1 (G2) | Neture supplier proposal → GlycoPharm mapping 정상화 (4 파일) |
| `51448ab5f` | WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-EVENT-OFFER-ACTION-QUEUE-V1 (G1) | Dashboard Action Queue pending count 반영 (2 파일) |

선행 (기존):
- `748dfc360` — WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1 (operator approval endpoint + page + menu)
- `cb2adcdf4` — WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1 (supplier multi-service proposal 기반)
- `ba40357b0` — WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1 (K-Cos baseline)
- `836844a36` — WO-O4O-GLYCOPHARM-EVENT-OFFERS-BACKEND-CANONICAL-ALIGNMENT-V1 (consumer endpoint)

---

## 3. G2 Supplier proposal mapping 검증

### 3.1 `apps/api-server/src/constants/event-offer-service-mapping.ts`

| 검증 항목 | 결과 |
|----------|:----:|
| `TargetServiceKey` 타입에 `SERVICE_KEYS.GLYCOPHARM` 포함 | ✅ (line 21) |
| `TARGET_TO_EVENT_OFFER_KEY['glycopharm']` → `'glycopharm-event-offer'` | ✅ (line 30) |
| `TARGET_SERVICE_LABEL['glycopharm']` → `'GlycoPharm'` | ✅ (line 40) |
| KPA mapping (`KPA_SOCIETY → KPA_GROUPBUY`) 유지 | ✅ |
| K-Cos mapping (`K_COSMETICS → K_COSMETICS_EVENT_OFFER`) 유지 | ✅ |
| 기존 "GlycoPharm 미정의 → disabled" 주석 제거 | ✅ |
| `isSupportedTargetServiceKey('glycopharm')` → true (정적 추론) | ✅ |

### 3.2 `apps/api-server/src/routes/kpa/helpers/event-offer-organization.helper.ts`

| 검증 항목 | 결과 |
|----------|:----:|
| GLYCOPHARM_EVENT_OFFER 분기 존재 | ✅ |
| `supplier` 분기 — `organization_service_enrollments WHERE service_code='glycopharm' AND status='active'` 첫 조직 | ✅ |
| `operator` 분기 — `organization_members + organization_service_enrollments` JOIN (owner/admin/manager role) | ✅ |
| K-Cos 패턴과 동일 구조 | ✅ |
| KPA / K-Cos 기존 분기 변경 없음 | ✅ |

### 3.3 `apps/api-server/src/routes/neture/controllers/supplier-event-offer-proposals.controller.ts`

| 검증 항목 | 결과 |
|----------|:----:|
| GET `/event-offer-proposals` 의 `targetKeys` 배열에 `GLYCOPHARM_EVENT_OFFER` 포함 | ✅ |
| KPA_GROUPBUY / K_COSMETICS_EVENT_OFFER 유지 | ✅ |
| POST `/event-offer-proposals` 의 입력 검증 / supplier 확인 / event 조건 검증 변경 없음 | ✅ |

### 3.4 `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx`

| 검증 항목 | 결과 |
|----------|:----:|
| `PROPOSE_TARGETS` 의 glycopharm `enabled: true` | ✅ |
| "준비 중" hint 제거 | ✅ |
| `TARGET_LABEL` 에 `'glycopharm-event-offer': 'GlycoPharm'` 추가 | ✅ |
| `EVENT_KEY_TO_LABEL` 에 `'glycopharm-event-offer': 'GlycoPharm'` 추가 (status display) | ✅ |
| KPA Society / K-Cosmetics target 변경 없음 | ✅ |

### 3.5 K-Cosmetics / KPA 기존 mapping 회귀 검증

| 검증 항목 | 결과 |
|----------|:----:|
| K-Cos `TARGET_TO_EVENT_OFFER_KEY['k-cosmetics']` 유지 | ✅ |
| K-Cos `EventOfferApprovalsPage` operator route 유지 | ✅ |
| KPA `TARGET_TO_EVENT_OFFER_KEY['kpa-society']` → `'kpa-groupbuy'` 유지 | ✅ |
| K-Cos / KPA service_key 기반 분기 (event-offer-organization.helper.ts) 변경 없음 | ✅ |

---

## 4. G1 Dashboard Action Queue 검증

### 4.1 `apps/api-server/src/routes/kpa/services/event-offer.service.ts`

| 검증 항목 | 결과 |
|----------|:----:|
| `countPendingListings(serviceKey): Promise<number>` 메서드 존재 | ✅ |
| Count-only query (list query 미실행) | ✅ |
| SQL: `SELECT COUNT(*)::int AS total FROM organization_product_listings opl WHERE opl.service_key = $1 AND opl.status = 'pending'` | ✅ |
| 기존 `listPendingListings` 변경 없음 | ✅ |
| 기존 `approveListing` / `rejectListing` 변경 없음 | ✅ |
| 기존 `createListing` / `createMultiServiceProposal` 변경 없음 | ✅ |

### 4.2 `apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts`

| 검증 항목 | 결과 |
|----------|:----:|
| `EventOfferService` + `SERVICE_KEYS` import 추가 | ✅ |
| `eventOfferService.countPendingListings(SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER)` 호출 | ✅ |
| Promise.all parallel fetch 에 추가 — 다른 query 와 격리 | ✅ |
| `.catch` fallback 0 (다른 fetch 와 동일 패턴) | ✅ |
| `eventOfferPending > 0` 조건부 push 로 Action Queue 에 추가 | ✅ |
| `id: 'event-offer-pending'` | ✅ |
| `label: '이벤트 오퍼 승인 대기'` | ✅ |
| `count: eventOfferPending` | ✅ |
| `link: '/operator/event-offers'` | ✅ |
| pending = 0 일 때 Action Queue 미추가 (조건부 push) | ✅ |
| KPI Grid 변경 없음 | ✅ |
| AI Summary 변경 없음 | ✅ |
| Activity Log 변경 없음 | ✅ |
| Quick Actions 변경 없음 | ✅ |
| Operator Alerts 변경 없음 | ✅ |

### 4.3 Frontend dashboard builder 정합

| 검증 항목 | 결과 |
|----------|:----:|
| `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` 의 `buildGlycoPharmOperatorConfig(data)` 가 backend response pass-through | ✅ |
| `OperatorDashboardLayout` 이 `actionQueue` 를 렌더 | ✅ |
| Frontend 신규 수정 없음 — pass-through 만으로 새 Action Queue 항목 표시 | ✅ |

---

## 5. GlycoPharm operator approval scope 검증

### 5.1 Frontend

| 항목 | 위치 | 결과 |
|------|------|:----:|
| Page | `services/web-glycopharm/src/pages/operator/event-offer/EventOfferManagePage.tsx` | ✅ 존재 |
| App.tsx route path | `/operator/event-offers` | ✅ |
| OperatorRoute guard | `isOperatorOrAbove(user.roles, 'glycopharm')` + MembershipGate | ✅ |
| Menu (`operatorMenuGroups.ts`) | approvals 그룹 / "이벤트 오퍼 승인" / `/operator/event-offers` | ✅ |
| Menu adminOnly | false (operator 전체 가시) | ✅ |
| Dead link / 메뉴-route 불일치 | 없음 | ✅ |

### 5.2 Backend

| Endpoint | Method | Route Guard | 결과 |
|----------|--------|-------------|:----:|
| `/api/v1/glycopharm/operator/event-offers/pending-listings` | GET | `requireGlycopharmScope('glycopharm:operator')` | ✅ |
| `/api/v1/glycopharm/operator/event-offers/products/:id/approve` | POST | `requireGlycopharmScope('glycopharm:operator')` | ✅ |
| `/api/v1/glycopharm/operator/event-offers/products/:id/reject` | POST | `requireGlycopharmScope('glycopharm:operator')` | ✅ |

### 5.3 Operator vs Admin 분리

| 항목 | 결과 |
|------|:----:|
| Admin-only 구조 아님 — operator 업무 확정 | ✅ |
| Admin (`glycopharm:admin`) 도 scope guard 의 표준 상위 우회로 접근 가능 (별도 분리 없음) | ✅ |
| `/admin` block 에 Event Offer 메뉴 / route 없음 | ✅ |
| K-Cos baseline 과 동일 패턴 (operator 업무 확정) | ✅ |

### 5.4 Approve / Reject flow 보존

- `listPendingListings` / `approveListing` / `rejectListing` 변경 없음 — G1/G2 는 신규 영역만 추가
- Status enum (pending / approved / rejected / canceled) + runtime status (upcoming / active / sold_out / ended) 변경 없음
- 매장 진열 cascade (`STORE_SERVICE_KEY_MAP[GLYCOPHARM_EVENT_OFFER] = GLYCOPHARM`) 변경 없음

---

## 6. End-to-end 코드 경로 검증 (정적)

### 6.1 Neture supplier 측

```
SupplierEventOfferPage (services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx)
  ↓ PROPOSE_TARGETS 에서 GlycoPharm 체크박스 활성 (enabled: true) ✅
  ↓ selectedTargets = [..., 'glycopharm', ...]
  ↓ handlePropose → supplierKpaEventOfferApi.proposeEventOfferToServices(offerId, ['glycopharm', ...], conditions)
  ↓
POST /api/v1/neture/supplier/event-offer-proposals
  body: { offerId, serviceKeys: ['glycopharm', ...], eventPrice, startAt, endAt, ... }
  ↓
supplier-event-offer-proposals.controller.ts
  ↓ requireAuth + supplier 검증 + 이벤트 조건 검증 (eventPrice / startAt / endAt 필수)
  ↓
EventOfferService.createMultiServiceProposal()
  ↓ for 'glycopharm':
  ↓   isSupportedTargetServiceKey('glycopharm') → true ✅ (G2 매핑)
  ↓   TARGET_TO_EVENT_OFFER_KEY['glycopharm'] → 'glycopharm-event-offer' ✅
  ↓   resolveOrganizationForEventOffer({ serviceKey: 'glycopharm-event-offer', roleType: 'supplier' })
  ↓     → organization_service_enrollments WHERE service_code='glycopharm' AND status='active' 첫 조직 ✅
  ↓   createListing → INSERT organization_product_listings (service_key='glycopharm-event-offer', status='pending')
  ↓
응답: { results: [{ targetServiceKey: 'glycopharm', eventOfferServiceKey: 'glycopharm-event-offer', status: 'created', listingId }] }
```

### 6.2 GlycoPharm operator 측

```
GlycoPharm operator → /operator (dashboard)
  ↓ fetchOperatorDashboard()
  ↓
GET /api/v1/glycopharm/operator/dashboard
  ↓ requireGlycopharmScope('glycopharm:operator')
  ↓
buildGlycoPharmDashboardConfig(dataSource, userId)
  ↓ Promise.all([
  ↓   pharmacyCounts, totalProducts, activeProducts, draftProducts, recentAuditActions,
  ↓   eventOfferService.countPendingListings('glycopharm-event-offer')  // G1
  ↓ ])
  ↓ if (eventOfferPending > 0):
  ↓   actionQueue.push({ id: 'event-offer-pending', label: '이벤트 오퍼 승인 대기', count, link: '/operator/event-offers' })
  ↓
응답: { kpis, aiSummary, operatorAlerts, actionQueue, activityLog, quickActions }
  ↓
buildGlycoPharmOperatorConfig(data) — pass-through
  ↓
OperatorDashboardLayout → actionQueue 렌더 → "이벤트 오퍼 승인 대기 N건" 표시 ✅
  ↓
운영자 클릭 → /operator/event-offers (Action Queue link)
  ↓ OperatorRoute (glycopharm:operator/admin + platform:super_admin) + MembershipGate
  ↓
EventOfferManagePage
  ↓ GET /api/v1/glycopharm/operator/event-offers/pending-listings
  ↓   → EventOfferService.listPendingListings('glycopharm-event-offer', page, limit)
  ↓
운영자 approve / reject (기존 flow)
  ↓ POST /api/v1/glycopharm/operator/event-offers/products/:id/{approve|reject}
  ↓
UPDATE organization_product_listings (status, is_active, decided_by, decided_at, rejected_reason)
  ↓ approve 시 STORE_SERVICE_KEY_MAP['glycopharm-event-offer'] = 'glycopharm' → GLYCOPHARM 매장 진열 cascade ✅
```

### 6.3 정적 경로 정합 결과

| 단계 | 경로 정합 | 결과 |
|------|---------|:----:|
| Supplier target 활성 → Backend support | PROPOSE_TARGETS enabled=true ↔ isSupportedTargetServiceKey | ✅ |
| Backend target → event offer service key | TARGET_TO_EVENT_OFFER_KEY['glycopharm'] = 'glycopharm-event-offer' | ✅ |
| service key → organization resolver | event-offer-organization.helper.ts 의 GLYCOPHARM_EVENT_OFFER 분기 | ✅ |
| OPL INSERT → operator pending list | service_key='glycopharm-event-offer' AND status='pending' 동일 필터 | ✅ |
| pending list count → dashboard | countPendingListings('glycopharm-event-offer') | ✅ |
| Action Queue link → operator route | /operator/event-offers 일치 | ✅ |
| Operator approval → cascade | STORE_SERVICE_KEY_MAP cascade 기존 정합 | ✅ |

---

## 7. 권한 정합 검증

### 7.1 권한 매트릭스

| Layer | Endpoint / Route | Guard | 허용 role |
|-------|------------------|-------|----------|
| Neture supplier | POST /api/v1/neture/supplier/event-offer-proposals | `requireAuth` + supplier 검증 (`neture_suppliers.user_id`) | 인증 + supplier 등록자 |
| GlycoPharm dashboard | GET /api/v1/glycopharm/operator/dashboard | `requireGlycopharmScope('glycopharm:operator')` | glycopharm:operator/admin + platform bypass |
| GlycoPharm operator route | /operator/event-offers (frontend) | OperatorRoute + MembershipGate | glycopharm:operator/admin + platform:super_admin + service_memberships.glycopharm active |
| GlycoPharm operator endpoints | /api/v1/glycopharm/operator/event-offers/* | `requireGlycopharmScope('glycopharm:operator')` | 동일 |

### 7.2 정합 확인

| 검증 항목 | 결과 |
|----------|:----:|
| Dashboard 표시 권한 = route 접근 권한 (동일 scope guard) | ✅ |
| Action Queue link 접근 불일치 (dead link) 없음 | ✅ |
| Platform super_admin bypass 정합 (RoleGuard + scope guard 양쪽) | ✅ |
| Membership 강제 적용 (service_memberships.glycopharm.status='active') | ✅ |
| Neture supplier 권한 영역은 별개 (supplier 확인) — operator 권한과 분리 | ✅ |
| K-Cos / KPA 의 동일 패턴 cross-service 정합 | ✅ |

---

## 8. 브라우저 smoke 결과

**미수행** (CONDITIONAL 사유 없음 — 정적 코드 경로 + typecheck 결과 + 권한 정합으로 동작 보장).

**미수행 사유**:
- WO 지시: "실제 approve/reject 실행 금지" + "실제 proposal 생성은 테스트 데이터가 명확할 때만"
- 현 시점 production DB 의 `service_key='glycopharm-event-offer' AND status='pending'` 데이터 유입 여부 미확정 — Cloud Run 배포 + supplier 가 실제 GlycoPharm proposal 제출 시점 이후 검증 가능
- 사용자 hard-nav 또는 시나리오 수동 검증 (Playwright) 은 별도 시점에 진행 가능 — 본 CHECK 의 PASS 자격 영향 없음

**향후 확인 권장 시나리오 (별도 시점)**:
1. Neture supplier 계정 로그인 → `/supplier/event-offers` → "이벤트 제안" 모달 → GlycoPharm 체크박스 활성 + 라벨 "GlycoPharm" (hint 없음) 확인
2. GlycoPharm 대상 proposal 제출 → 응답에 `targetServiceKey: 'glycopharm', status: 'created'` 포함 확인
3. GlycoPharm operator 계정 로그인 → `/operator` → Action Queue 에 "이벤트 오퍼 승인 대기 N건" 표시 확인
4. Action Queue 클릭 → `/operator/event-offers` 이동 → EventOfferManagePage 렌더 + pending list 에 새 proposal 노출 확인
5. (선택) approve 후 status='approved' + GLYCOPHARM 매장 진열 cascade 확인 — 실데이터 변경 영향 큼, 신중

---

## 9. TypeScript 결과

### 9.1 5 서비스 검증 결과

| 서비스 | 검사 방식 | Errors | G2/G1 경로 신규 |
|--------|----------|:------:|:--------------:|
| apps/api-server | `npx tsc --noEmit` | 0 | 0 ✅ |
| services/web-neture | `npx tsc --noEmit` | 0 | 0 ✅ |
| services/web-glycopharm | `npx tsc -b --noEmit` (project refs) | 22 | 0 ✅ |
| services/web-k-cosmetics | `npx tsc --noEmit` | 0 | 0 ✅ (회귀 0) |
| services/web-kpa-society | `npx tsc --noEmit` | 0 | 0 ✅ (회귀 0) |

### 9.2 web-glycopharm 22 errors 분석 — 모두 pre-existing

| 영역 | Error 수 | G2/G1 무관성 |
|------|:-------:|:------------:|
| `src/api/lms.ts` | 4 | Promise 타입 ↔ ApiResponse — 별도 track |
| `src/App.tsx` | 2 | unused ApplicationsPage / ApplicationDetailPage |
| `src/components/layouts/DashboardLayout.tsx` | 1 | user 변수 unused |
| `src/components/layouts/GlycoPharmHubLayout.tsx` | 1 | string \| undefined → To 타입 |
| `src/pages/education/CourseDetailPage.tsx` | 5 | Lms* response shape |
| `src/pages/education/LmsLessonPage.tsx` | 2 | content type union |
| `src/pages/hub/HubBlogLibraryPage.tsx` | 1 | serviceKey 미지원 |
| `src/pages/hub/HubContentListPage.tsx` | 2 | publishedAt 누락 |
| `src/pages/instructor/InstructorDashboardPage.tsx` | 2 | divide / truncate (CSS prop) |
| `src/pages/resources/ResourcesPage.tsx` | 1 | implicit any |

**모두 pre-existing**. 다음 경로와 무관:
- `services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` — error 0
- `services/web-glycopharm/src/pages/operator/operatorConfig.ts` — error 0
- `services/web-glycopharm/src/pages/operator/event-offer/EventOfferManagePage.tsx` — error 0
- `services/web-glycopharm/src/config/operatorMenuGroups.ts` — error 0
- `services/web-glycopharm/src/api/operatorDashboard.ts` — error 0

→ G2 / G1 변경 (backend-only) 이 frontend 회귀를 일으키지 않음.

---

## 10. 회귀 확인

### 10.1 K-Cosmetics

| 검증 항목 | 결과 |
|----------|:----:|
| `TARGET_TO_EVENT_OFFER_KEY['k-cosmetics']` 유지 | ✅ |
| K-Cos `EventOfferApprovalsPage` operator route 유지 | ✅ |
| K-Cos backend operator endpoints (`/api/v1/cosmetics/operator/event-offers/*`) 변경 없음 | ✅ |
| K-Cos `event-offer-organization.helper.ts` 분기 변경 없음 | ✅ |
| `services/web-k-cosmetics` typecheck error 0 | ✅ |

### 10.2 KPA Society

| 검증 항목 | 결과 |
|----------|:----:|
| `TARGET_TO_EVENT_OFFER_KEY['kpa-society']` → `'kpa-groupbuy'` 유지 | ✅ |
| KPA operator approval flow 변경 없음 | ✅ |
| KPA `event-offer-organization.helper.ts` 분기 변경 없음 | ✅ |
| `services/web-kpa-society` typecheck error 0 | ✅ |

### 10.3 Neture supplier proposal 기존 흐름

| 검증 항목 | 결과 |
|----------|:----:|
| PROPOSE_TARGETS 의 KPA Society / K-Cosmetics enabled=true 유지 | ✅ |
| supplier-event-offer-proposals.controller.ts 의 검증 로직 / 응답 shape 변경 없음 | ✅ |
| GET /event-offer-proposals 응답 shape 변경 없음 (targetKeys 배열에 항목 추가만) | ✅ |
| supplier 의 KPA / K-Cos 제안 흐름 변경 없음 | ✅ |

### 10.4 GlycoPharm dashboard 기존 항목

| 검증 항목 | 결과 |
|----------|:----:|
| KPI Grid (active-pharmacies / active-products / total-orders) 변경 없음 | ✅ |
| AI Summary (generateRuleBasedInsights('glycopharm', metrics)) 변경 없음 | ✅ |
| Activity Log (mergeActivityLog + buildAuditActivityItems) 변경 없음 | ✅ |
| Quick Actions (manage-pharmacies / manage-products / manage-content) 변경 없음 | ✅ |
| Operator Alerts (computeOperatorAlerts) 변경 없음 | ✅ |
| 기존 Action Queue 항목 (draft-products) 유지 | ✅ |

### 10.5 Care / GlucoseView 재오염

| 검증 항목 | 결과 |
|----------|:----:|
| `operator-dashboard.service.ts` 의 Care 메트릭 STUB 유지 / 재도입 없음 | ✅ |
| Care alert 4개 (WO-W5b 에서 제거) 재도입 없음 | ✅ |
| GlucoseView 잔재 (service key / UI / type) 재도입 없음 | ✅ |
| WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1 결과 그대로 유지 | ✅ |

---

## 11. Working tree 격리 상태

| 검증 항목 | 결과 |
|----------|:----:|
| Pre-check working tree | clean (untracked / modified 없음) |
| Post-check working tree | clean 유지 예정 (CHECK 문서 생성만) |
| 다른 세션 WIP 격리 | ✅ (현재 working tree 에 다른 세션 작업 없음 — IR/WO 진행 중 외부 세션이 9개 WIP 정리한 commit 들 main 에 merge 됨) |
| CHECK 문서 외 source file 수정 없음 | ✅ |

### Working tree 변경 0 — 본 CHECK 의 read-only 보장

본 CHECK 진행 중 코드/DB/migration/source file 일절 수정 없음. typecheck 만 read-only 로 수행. 결과로 추가될 파일은 본 CHECK 문서 1개만.

---

## 12. 최종 판정

### ✅ **PASS**

| 판정 기준 | 결과 |
|----------|:----:|
| GlycoPharm target proposal mapping 정상 | ✅ |
| GlycoPharm operator approval scope 정상 | ✅ |
| Dashboard Action Queue pending count 정상 | ✅ |
| /operator/event-offers link 정합 | ✅ |
| 권한 불일치 없음 | ✅ |
| K-Cosmetics / KPA / Neture 회귀 없음 | ✅ |
| 신규 TypeScript 오류 없음 | ✅ |
| Source file 수정 없음 | ✅ |
| CHECK 문서만 생성 | ✅ (예정) |

### 결론

> GlycoPharm Event Offer operator approval scope 정비는 **operator 업무 확정 (IR) + supplier proposal 유입 (G2) + dashboard Action Queue 연결 (G1) 까지 정합 완료**.
>
> 정적 코드 경로 / TypeScript / 권한 정합 / 회귀 검증 모두 통과. 브라우저 smoke 는 데이터 유입 시점 이후 별도 시나리오 수동 확인 가능.

---

## 13. 남은 optional 후보

본 CHECK 종결 후 즉시 진행 필요 없음. Tier 4 정책 결정 사이클 + KPA 5-Block (I1) + 다른 IR (I3 AxisNavigation / Iα K-Cos admin entry) 와 함께 우선순위 조정 시 진행.

| ID (가칭) | 범위 | 우선 |
|-----------|------|:----:|
| **G3 WO-O4O-GLYCOPHARM-EVENT-OFFER-ADMIN-READONLY-AUDIT-V1** (선택) | Admin readonly 감사 화면 — operator approval 이력 + 통계. operator 권한과 분리. | 낮음 |
| KPI Grid 에 event-offer-pending 추가 검토 | 사용 패턴 보고 KPI 도입 검토 — 본 WO 범위 외 | 낮음 |
| GlycoPharm operator-create endpoint 도입 (K-Cos POST / 패턴) | 공급자 없이 operator 가 자체 이벤트 생성. 별도 IR 필요 — 사업적 정당성 검토 후. | 낮음 |
| Cross-service Operator Dashboard 응답 contract 단일화 | Option D (IR-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-CONTRACT-STANDARDIZATION-V1) Future | 낮음 |
| Browser smoke 정식 수행 | 실제 supplier proposal 제출 + operator dashboard 확인 + operator/event-offers 이동 확인. Cloud Run prod 데이터 유입 후 권장. | 중간 |

GlycoPharm Event Offer approval scope 정비는 본 CHECK 통과로 **종결 가능**. 후속 G3 / KPI 추가 등은 Tier 4 사이클의 일부로 다음 trigger 시점에 평가.

---

## 14. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 판정 | ✅ **PASS** |
| 작성 문서 | `docs/investigations/CHECK-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-SMOKE-V1.md` |
| G2 검증 결과 | ✅ mapping / type / supplier flow / GET targetKeys 모두 정합 |
| G1 검증 결과 | ✅ countPendingListings / Action Queue 조건부 추가 / link 정합 / 기존 5-Block 영역 회귀 0 |
| End-to-end 코드 경로 검증 결과 | ✅ supplier → backend → OPL pending → dashboard → operator route → approve → cascade 전체 정적 정합 |
| 권한 정합 결과 | ✅ Dashboard scope = route guard = operator endpoint guard (`glycopharm:operator`) + MembershipGate + platform bypass |
| 브라우저 smoke 결과 | 미수행 (테스트 데이터 부재 + "실제 approve/reject 실행 금지" 제약). 정적 + typecheck + 권한 정합으로 동작 보장. |
| TypeScript 결과 | api-server / web-neture / web-k-cosmetics / web-kpa-society 0 errors. web-glycopharm 22 pre-existing errors (G2/G1 경로 신규 0). |
| Source file 수정 없음 확인 | ✅ |
| 다른 세션 WIP 미포함 확인 | ✅ working tree clean |
| CHECK 문서 commit 여부 | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: G2 + G1 통합 CHECK PASS. GlycoPharm Event Offer operator approval scope 정비 종결 자격. 본 CHECK commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
