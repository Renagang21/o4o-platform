# IR-PHARMACY-HUB-REAL-USAGE-VALIDATION-V1

> **목적**: 약국 개설자 허브가 설계된 트리 구조와 실제 사용 흐름에서 완전히 일치하는지 전면 검증
> **일시**: 2026-02-15
> **유형**: 읽기 전용 검증 (코드 수정 금지)
> **기준**: PHARMACY-TREE-BASELINE-V1 (88c8b6eb6)

---

## Executive Summary

```
Case 1 (미로그인):      PASS
Case 2 (일반 약사):     PASS
Case 3 (미승인 개설자): FAIL — 승인 후 허브 진입 불가 (게이트 루프)
Case 4 (승인된 개설자): PARTIAL — 3건 이슈 발견
Case 5 (구조 안정성):   PASS

발견된 문제: 5건
  P1 (HIGH):   승인된 개설자 게이트 루프
  P2 (HIGH):   KPI 쿼리 listing.is_active 미반영
  P3 (MEDIUM): 채널 URL 파라미터 미사용
  P4 (LOW):    뒤로가기 시 상태 미유지
  P5 (LOW):    비승인 채널 입력 HTML disabled 미적용
```

---

## Case 1 — 미로그인 사용자: PASS

| 항목 | 결과 | 근거 |
|------|------|------|
| 허브 직접 URL 접근 시 리다이렉트 | **PASS** | PharmacyPage.tsx L42-71: `if (!user)` → "로그인 필요" 메시지 + 로그인 버튼 |
| API 호출 차단 | **PASS** | 미로그인 상태에서 API 호출 없음 |
| Console 오류 없음 | **PASS** | 별도 API 호출 없어 오류 가능성 없음 |

**동작**: `/pharmacy` → "로그인 필요" UI + `/login?returnTo=/pharmacy` 버튼 표시.
`/pharmacy/hub` → ContextGuard가 `/pharmacy`로 리다이렉트 → 같은 결과.

---

## Case 2 — 일반 약사 (pharmacy_owner 아님): PASS

| 항목 | 결과 | 근거 |
|------|------|------|
| FunctionGateModal 정상 표시 | **PASS** | PharmacyPage.tsx L103: `if (!user.pharmacistRole)` → 모달 |
| 직접 /pharmacy/hub 접근 차단 | **PASS** | ContextGuard `requiredType="pharmacy"` → fallback `/pharmacy` |
| ContextGuard 오작동 없음 | **PASS** | 비개설자 context type ≠ "pharmacy" → 정상 리다이렉트 |

**동작**: `/pharmacy` → "약국 개설자 전용 서비스" 메시지 + 신청 링크.
`/pharmacy/hub` → ContextGuard → `/pharmacy`로 리다이렉트.

---

## Case 3 — 개설자 (미승인): FAIL

| 항목 | 결과 | 근거 |
|------|------|------|
| 중복 신청 시 409 반환 | **PASS** | organization-join-request.controller.ts L132-147: 중복 체크 → 409 |
| 승인 전 허브 접근 차단 | **PASS** | PharmacyPage.tsx L164: pharmacy_owner → `/pharmacy/approval` |
| 승인 후 허브 진입 가능 | **FAIL** | PharmacyPage.tsx L164: **항상** approval로 리다이렉트 |

### P1 (HIGH) — 승인된 개설자 게이트 루프

**문제**: `PharmacyPage.tsx` L164에서 `pharmacistRole === 'pharmacy_owner'`이면 **무조건** `/pharmacy/approval`로 Navigate.
승인 상태를 체크하는 로직이 없음.

```
pharmacy_owner → PharmacyPage → Navigate("/pharmacy/approval") → 무한 루프
```

**근본 원인**: User 객체에 `pharmacyApprovalStatus` 필드 없음. 승인 여부를 프론트엔드에서 판단할 수 없음.

**영향**: 승인된 개설자가 `/pharmacy`를 통해 허브에 진입할 수 없음.
단, `/pharmacy/hub` 직접 접근은 ContextGuard를 통해 가능할 수 있음 (pharmacy context가 설정되어 있다면).

---

## Case 4 — 승인된 개설자 (핵심 시나리오)

### Step 1 — 허브 진입: PASS

| 항목 | 결과 | 근거 |
|------|------|------|
| ChannelLayerSection 최상단 | **PASS** | PharmacyDashboardPage.tsx L45: 첫 번째 섹션 |
| 승인/대기/정지 배지 정상 | **PASS** | ChannelLayerSection: 6개 상태 모두 배지 렌더링 |
| KPI 수치 표시 | **PARTIAL** | P2 참조 — listing.is_active 미반영 |
| "N/M 활성" 계산 | **PARTIAL** | visibleProductCount 공식 불완전 |

**API**: `GET /store-hub/channels` → store-hub.controller.ts L237-302

### Step 2 — 채널 클릭: PARTIAL

| 항목 | 결과 | 근거 |
|------|------|------|
| channel 쿼리 파라미터 정상 | **FAIL** | P3: URL에 `?channel=B2C` 전달하나 PharmacySellPage에서 미사용 |
| 필터 칩 동기화 | **FAIL** | useSearchParams() 미사용 |
| 뒤로가기 시 상태 유지 | **FAIL** | P4: `<a href>` 사용 — React Router 상태 소실 |

**네비게이션**: ChannelLayerSection L119: `navigate(/pharmacy/sell?channel=${ch.channelType})`

### P3 (MEDIUM) — 채널 URL 파라미터 미사용

**문제**: ChannelLayerSection에서 `/pharmacy/sell?channel=B2C`로 이동하지만,
PharmacySellPage에 `useSearchParams()` 또는 `useLocation()` 호출 없음.
채널 필터가 사전 선택되지 않음.

### P4 (LOW) — 뒤로가기 상태 미유지

**문제**: PharmacySellPage L47: `<a href="/pharmacy/hub">` — 하드코딩 href 사용.
React Router Link 대신 HTML anchor → 전체 페이지 리로드, 상태 소실.

### Step 3 — 상품 진열: PARTIAL

| 항목 | 결과 | 근거 |
|------|------|------|
| 신청 → 승인 → listing 생성 | **PASS** | pharmacy-products.controller.ts L84-180 |
| listing 비활성화 시 KPI 감소 | **FAIL** | P2: KPI 쿼리가 listing.is_active 미참조 |
| 비승인 채널 설정 차단 | **PASS** | ChannelSettingsPanel: "채널 승인 후 설정 가능" 메시지 |

### P2 (HIGH) — KPI 쿼리 listing.is_active 미반영

**문제**: store-hub.controller.ts L280-287:

```sql
-- 현재 (INCORRECT)
SELECT channel_id,
  COUNT(*) FILTER (WHERE is_active = true) AS visible_count
FROM organization_product_channels
GROUP BY channel_id

-- 정확한 쿼리 (EXPECTED)
SELECT opc.channel_id,
  COUNT(*) FILTER (WHERE opc.is_active = true AND opl.is_active = true) AS visible_count
FROM organization_product_channels opc
JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
GROUP BY opc.channel_id
```

**영향**: listing을 비활성화해도 product_channel.is_active가 true이면 KPI에 여전히 "활성"으로 집계.

### Step 4 — 채널 설정 패널: PASS

| 항목 | 결과 | 근거 |
|------|------|------|
| isVisible 토글 | **PASS** | PharmacySellPage L625-633 |
| sales_limit ≤ 0 입력 방지 | **PASS** | Frontend L498-505 + Backend L360-368: 양쪽 검증 |
| display_order 저장 | **PASS** | type="number", min=0 |
| dirty flag 초기화 | **PASS** | setDirty(true) on change, save 후 초기화 |
| 비승인 채널 입력 비활성 | **PARTIAL** | P5: opacity=0.6 처리만, HTML disabled 미적용 |

### P5 (LOW) — 비승인 채널 HTML disabled 미적용

**문제**: 비승인 채널 UI에 `opacity: 0.6` 스타일만 적용.
HTML `disabled` 속성 미적용. API 레벨에서 차단하므로 실질적 위험은 낮음.

### Step 5 — KPI 일관성: FAIL

P2와 동일 이슈. `visibleProductCount` 공식이 `organization_product_listings.is_active`를 반영하지 않음.

`salesLimitConfiguredCount`는 정확함: `COUNT(*) FILTER (WHERE sales_limit IS NOT NULL)`.

---

## Case 5 — 구조 안정성: PASS

### FK 제약 검증

| 테스트 | 결과 | 근거 |
|--------|------|------|
| org 삭제 → RESTRICT | **PASS** | FK_org_channel_organization (RESTRICT) + FK_listing_organization (RESTRICT) |
| 채널 삭제 → product_channel CASCADE | **PASS** | FK_product_channel_channel (CASCADE). listing은 유지 |
| pharmacy-org PK 공유 | **PASS** | FK_pharmacy_organization (CASCADE). pharmacy.id = organization.id 보장 |

### SQL 무결성

| 쿼리 | 결과 | 보장 메커니즘 |
|------|------|-------------|
| orphan listing | 0건 보장 | FK_listing_organization RESTRICT |
| orphan product_channel | 0건 보장 | FK_product_channel_listing CASCADE |
| pharmacy-org 불일치 | 0건 보장 | FK_pharmacy_organization (PK 공유) |

### 성능

| 항목 | 결과 |
|------|------|
| 쿼리 패턴 | LEFT JOIN 서브쿼리 (N+1 없음) |
| 인덱스 커버리지 | IDX_org_channel_org_id, IDX_product_channel_channel_id, IDX_product_channel_active |
| 100ch + 1000prod 추정 | < 50ms |
| 풀 스캔 위험 | 없음 |

---

## 종합 판정

### 문제 목록

| # | 심각도 | 문제 | 위치 | 영향 |
|---|--------|------|------|------|
| **P1** | HIGH | 승인된 개설자 게이트 루프 | PharmacyPage.tsx L164 | 허브 진입 불가 |
| **P2** | HIGH | KPI listing.is_active 미반영 | store-hub.controller.ts L280-287 | 상품 비활성화 KPI 미반영 |
| **P3** | MEDIUM | 채널 URL 파라미터 미사용 | PharmacySellPage.tsx | UX 비연속 |
| **P4** | LOW | 뒤로가기 상태 미유지 | PharmacySellPage.tsx L47 | UX 비연속 |
| **P5** | LOW | 비승인 채널 HTML disabled | PharmacySellPage.tsx L598 | UX 미세 |

### 구조적 위험

- **없음**. FK 제약 모두 정상. CASCADE/RESTRICT 정책 일관됨. 성능 우수.

### 권장 조치

| 순위 | 조치 |
|------|------|
| **P0** | P1 수정: PharmacyPage에서 승인 상태 체크 추가 (User 객체 또는 API 조회) |
| **P1** | P2 수정: KPI 서브쿼리에 `JOIN organization_product_listings` + `opl.is_active=true` 추가 |
| **P2** | P3 수정: PharmacySellPage에서 `useSearchParams()` 읽어 채널 필터 사전 선택 |
| **P3** | P4+P5: UX 개선 (Link 컴포넌트 사용, HTML disabled 적용) |

---

## 관련 파일

| 구분 | 파일 |
|------|------|
| Gate | `services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx` |
| Approval | `services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx` |
| Hub | `services/web-kpa-society/src/pages/pharmacy/PharmacyDashboardPage.tsx` |
| Channel L1 | `services/web-kpa-society/src/pages/pharmacy/sections/ChannelLayerSection.tsx` |
| Sell L2-3 | `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx` |
| KPI API | `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` |
| Product API | `apps/api-server/src/routes/kpa/controllers/pharmacy-products.controller.ts` |
| Join Request | `apps/api-server/src/routes/kpa/controllers/organization-join-request.controller.ts` |

## 관련 IR

- [IR-PHARMACY-HUB-TREE-INTEGRITY-VALIDATION-V1](./IR-PHARMACY-HUB-TREE-INTEGRITY-VALIDATION-V1.md) — 트리 무결성 검증
- [IR-PHARMACY-HUB-STRUCTURE-VALIDATION-V1](./IR-PHARMACY-HUB-STRUCTURE-VALIDATION-V1.md) — 구조 부분 검증
