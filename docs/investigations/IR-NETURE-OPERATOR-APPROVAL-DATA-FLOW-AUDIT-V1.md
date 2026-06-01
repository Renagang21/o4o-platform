# IR-NETURE-OPERATOR-APPROVAL-DATA-FLOW-AUDIT-V1

> 작성: 2026-03-25
> 조사 방법: 코드 정적 분석 (수정 없음)

---

## 0. 문제 요약

```
대시보드: "상품 승인 대기" 9건 표시
→ 클릭 시: 공급 현황 페이지 (SupplyDashboardPage)
→ 실제 데이터 없음 (또는 무관한 데이터)
```

---

## 1. 데이터 흐름 다이어그램

```
[Backend: operator-dashboard.controller.ts L80-87]
  SELECT COUNT(*) FILTER (WHERE approval_status = 'PENDING')
  FROM supplier_product_offers
  ↓
  products.pending = 9
  ↓
[Action Queue 구성: L218]
  { label: '상품 승인 대기', count: 9, link: '/operator/supply' }
  ↓
[Frontend: ActionQueueBlock.tsx]
  <Link to="/operator/supply">  ← 절대 경로
  ↓
[App.tsx L843: Legacy Redirect]
  /operator/* → /workspace/operator/*
  → /workspace/operator/supply
  ↓
[App.tsx L741: Route]
  /workspace/operator/supply → <SupplyDashboardPage />
  ↓
[SupplyDashboardPage.tsx]
  API: GET /neture/operator/supply-products
  → offer.service.ts getOperatorSupplyProducts()
  → 조회 테이블: product_approvals (approval_type IN ('private','service'))
  → 표시: 공급 가능 상품 카드 목록 (available / pending / approved / rejected)
```

---

## 2. 핵심 발견: 3개 데이터가 완전 분리

### 2.1 대시보드 KPI 숫자 (9건)

| 항목 | 값 |
|------|-----|
| **소스** | `operator-dashboard.controller.ts` L80-87 |
| **테이블** | `supplier_product_offers` |
| **조건** | `approval_status = 'PENDING'` |
| **의미** | **공급자가 등록한 오퍼 중 관리자 승인 대기** (오퍼 레벨) |
| **처리 주체** | Admin (상품 승인 페이지) |

```sql
-- L80-87: 실제 쿼리
SELECT
  COUNT(*) FILTER (WHERE approval_status = 'PENDING')::int AS pending
FROM supplier_product_offers
```

### 2.2 링크 대상 (SupplyDashboardPage)

| 항목 | 값 |
|------|-----|
| **소스** | `offer.service.ts` L784-841 `getOperatorSupplyProducts()` |
| **테이블** | `supplier_product_offers` + `product_approvals` |
| **의미** | **약국/Operator가 공급 받을 상품을 신청하는 화면** |
| **처리 주체** | Operator (약국이 상품 취급 신청) |

이 페이지는 `product_approvals`에서 현재 로그인한 operator의 조직에 대한 공급 요청 상태를 보여준다. 오퍼의 admin 승인 상태(`PENDING`)와는 무관하다.

### 2.3 서비스별 상품 승인 (offer_service_approvals)

| 항목 | 값 |
|------|-----|
| **소스** | `offer-service-approval.service.ts` (WO-NETURE-PRODUCT-APPROVAL-FLOW-V1) |
| **테이블** | `offer_service_approvals` |
| **의미** | **공급자가 선택한 서비스별 승인** (서비스 레벨) |
| **처리 주체** | Operator (서비스별 상품 승인 페이지) |

대시보드는 이 테이블을 **조회하지 않는다** — 아직 미반영.

---

## 3. Q&A (핵심 질문 답변)

### Q1. 대시보드 9건은 어떤 테이블 기준인가?

**`supplier_product_offers`** 테이블, `approval_status = 'PENDING'` 조건.
- 공급자가 상품을 등록하면 오퍼가 `PENDING` 상태로 생성됨
- Admin이 승인하면 `APPROVED`로 변경
- 현재 PENDING인 오퍼가 9개

### Q2. 서비스 승인 API pending 건수는?

**별도 확인 필요** (배포 후 API 호출 필요). 대시보드는 `offer_service_approvals` 테이블을 전혀 조회하지 않으므로, 이 테이블의 pending 건수가 몇 개이든 대시보드에 반영되지 않음.

### Q3. 공급 요청 페이지는 어떤 데이터를 보여주는가?

`SupplyDashboardPage` → `getOperatorSupplyProducts()`:
- `supplier_product_offers` 중 `is_active=true`, `distribution_type IN ('PUBLIC','SERVICE')` 상품
- 각 상품에 대해 `product_approvals` 조회 → 현재 operator 조직의 공급 신청 상태 매핑
- 표시: 카드 목록 (available / pending / approved / rejected)
- **오퍼의 admin 승인 상태(PENDING/APPROVED)와 무관**

### Q4. "상품 승인 대기" 클릭 시 이동 URL은?

```
Backend: link: '/operator/supply'
→ Legacy redirect (App.tsx L843): /operator/* → /workspace/operator/*
→ 최종: /workspace/operator/supply
→ Page: SupplyDashboardPage
```

### Q5. 3개 데이터가 연결되어 있는가?

**완전 분리.**

| 데이터 | 테이블 | 의미 | 현재 대시보드 반영 |
|--------|--------|------|:------------------:|
| 오퍼 승인 대기 (9건) | `supplier_product_offers` | Admin이 오퍼 승인/거절 | YES (KPI + Action) |
| 공급 요청 | `product_approvals` | 약국이 상품 취급 신청 | NO |
| 서비스별 승인 | `offer_service_approvals` | Operator가 서비스별 승인 | NO |

---

## 4. 문제 원인 (1줄 요약)

> **Action Queue의 "상품 승인 대기" 9건은 `supplier_product_offers.approval_status='PENDING'` 기준이지만, 링크(`/operator/supply`)는 공급 요청 페이지(product_approvals 기반)로 연결되어 데이터 불일치가 발생한다.**

---

## 5. 라우팅 매핑 전체 정리

### Action Queue (Backend L214-221)

| id | label | count 소스 | link | 대상 페이지 | 올바른 대상 |
|----|-------|-----------|------|------------|------------|
| `pending-regs` | 가입 승인 대기 | `service_memberships.pending` | `/operator/applications` | RegistrationRequestsPage | **OK** |
| `pending-suppliers` | 공급사 승인 대기 | `neture_suppliers.PENDING` | `/operator/supply` | SupplyDashboardPage | **WRONG** → `/operator/admin-suppliers` |
| `pending-products` | 상품 승인 대기 | `supplier_product_offers.PENDING` | `/operator/supply` | SupplyDashboardPage | **WRONG** → `/operator/product-approvals` |
| `partner-requests` | 파트너 요청 | `neture_partnership_requests.OPEN` | `/operator/applications` | RegistrationRequestsPage | **QUESTIONABLE** |
| `unread-messages` | 미확인 문의 | `neture_contact_messages.!resolved` | `/operator/community` | ForumManagementPage | **WRONG** → `/operator/contact-messages` |

### 추가 발견: 3개 링크 오류

1. **`pending-suppliers`**: 공급사 승인 → `/operator/supply`(공급 현황) 이동. 올바른 대상은 `/operator/admin-suppliers` (Admin 공급사 승인 페이지)
2. **`pending-products`**: 상품 승인 → `/operator/supply`(공급 현황) 이동. 올바른 대상은 `/operator/product-approvals` (Admin 상품 승인 페이지)
3. **`unread-messages`**: 미확인 문의 → `/operator/community`(포럼 관리) 이동. 올바른 대상은 `/operator/contact-messages` (Admin 문의 메시지 페이지)

---

## 6. 서비스별 승인과 대시보드 미연결

WO-NETURE-PRODUCT-APPROVAL-FLOW-V1에서 `offer_service_approvals` 테이블과 Operator UI가 추가되었지만:

- 대시보드 KPI에 서비스별 승인 대기 건수가 없음
- Action Queue에 서비스별 승인 항목이 없음
- Quick Actions에 서비스별 승인 바로가기가 없음

---

## 7. 수정 범위 (권고)

### 최소 수정 (P1 — 링크 오류)

**파일**: `operator-dashboard.controller.ts` L214-221

| 항목 | 현재 link | 수정 후 link |
|------|----------|-------------|
| `pending-suppliers` | `/operator/supply` | `/operator/admin-suppliers` |
| `pending-products` | `/operator/supply` | `/operator/product-approvals` |
| `unread-messages` | `/operator/community` | `/operator/contact-messages` |

### 추가 수정 (P2 — 서비스 승인 대시보드 연동)

1. 대시보드 SQL에 `offer_service_approvals WHERE approval_status = 'pending'` 카운트 추가
2. Action Queue에 서비스별 승인 대기 항목 추가 → `/operator/product-service-approvals`

---

## 참조 파일

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` | 대시보드 5-block 데이터 생성 |
| `apps/api-server/src/modules/neture/services/offer.service.ts` L784-841 | getOperatorSupplyProducts() |
| `services/web-neture/src/pages/operator/SupplyDashboardPage.tsx` | 공급 현황 페이지 |
| `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` | 대시보드 렌더링 |
| `packages/operator-ux-core/src/blocks/ActionQueueBlock.tsx` | Action Queue `<Link>` 렌더링 |
| `services/web-neture/src/App.tsx` L843 | `/operator/*` → `/workspace/operator/*` 리디렉트 |

---

*작성: 2026-03-25*
*방법: 코드 정적 분석 (수정 없음)*
