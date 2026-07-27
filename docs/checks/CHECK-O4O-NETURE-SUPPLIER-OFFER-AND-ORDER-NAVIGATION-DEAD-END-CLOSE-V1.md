# CHECK-O4O-NETURE-SUPPLIER-OFFER-AND-ORDER-NAVIGATION-DEAD-END-CLOSE-V1

> **성격:** 공급자 동선 dead-end/자기참조 CTA 최소 수정 (기존 동작 화면으로 연결). 신규 엔진/데이터모델 0 · DB write 0 · migration 0.
> **작성일:** 2026-07-27
> **대상 WO:** WO-O4O-NETURE-SUPPLIER-OFFER-AND-ORDER-NAVIGATION-DEAD-END-CLOSE-V1
> **선행 감사:** [`IR-O4O-NETURE-SUPPLIER-FULL-WORKFLOW-AND-DASHBOARD-CLOSEOUT-AUDIT-V1`](../investigations/IR-O4O-NETURE-SUPPLIER-FULL-WORKFLOW-AND-DASHBOARD-CLOSEOUT-AUDIT-V1.md) — DEAD-END-1 / DEAD-LINK-1 (둘 다 P1)
> **결과:** **GREEN** — 준비 중 stub 0 · 자기참조 CTA 0 · 실제 유통·주문 처리 화면 도달 · typecheck/build EXIT 0 · redirect loop 0 · 권한 회귀 0.

---

## 1. 목표 (2개 P1 dead-end 종료)

| ID | 위치 | 문제 | 수정 |
|----|------|------|------|
| **DEAD-END-1** | `SupplierSupplyOffersPage` "판매자 모집" 카드 | 대시된 테두리 + "준비 중" 배지 + CTA 0 (stale — 실기능은 이미 배포됨) | 작동 CTA로 전환 → `/supplier/recruitments` |
| **DEAD-LINK-1** | `SupplierOrdersPage:179` CTA "주문 처리·배송 workspace 열기" | `to="/supplier/orders"` 자기참조 (현재 화면 재로드) | `to="/account/supplier/orders"` (실제 처리 목록) |

원칙(§1): 신규 오퍼 엔진 생성 0. 이미 동작하는 화면으로 연결. 중복 화면 확대 0.

## 2. 구현 전 계약 확인 (추측 없이 route·importer로 확정)

### 2.1 공급 오퍼 화면 실태 — "빈 페이지" 아님, 이미 안내 허브

[`SupplierSupplyOffersPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierSupplyOffersPage.tsx) 정독 결과:
- 헤더 = "공급 오퍼 안내 허브" (WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1).
- 카드 3개 중 **2개는 이미 작동 CTA** (`<Link to="/supplier/products">` — 일반 공급 오퍼 / 서비스별 공급 상태).
- **세 번째 "판매자 모집" 카드만** 대시 border + "준비 중" 배지 + 링크 없음 = 유일 결함.

→ §5 **B안(안내 허브 유지, 준비 중 stub 제거·명확 CTA)**이 적합. A안(redirect)은 부적합 — 페이지 자체가 실질 내용·작동 CTA를 가진 허브이므로 폐기 대상이 아님.

### 2.2 "판매자 모집"은 이미 배포된 실기능

- Route: `App.tsx:809` `/supplier/recruitments` → `SupplierRecruitmentsPage`.
- 정체: [`SupplierRecruitmentsPage.tsx:1-6`](../../services/web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx#L1-L6) = "공급자 판매자 모집 현황" — 모집 목록 + 상태 + 신청 카운트(전체/대기/승인/반려) + 대상 서비스/연결 제품 + 서비스 노출 승인 (WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1).

→ "준비 중" 문구는 **stale**. 실기능이 존재하므로 stub을 제거하고 그 화면으로 연결하는 것이 §1 원칙("이미 동작하는 화면으로 연결")에 정확히 부합.

### 2.3 주문 처리 canonical 목록 확정

- `App.tsx:812` `/supplier/orders` → `SupplierOrdersPage` (운영 허브·읽기 통합 대시보드) — CTA가 자기 자신을 가리켜 클릭 시 같은 화면 재로드.
- `App.tsx:861` `/account/supplier/orders` → `SupplierOrdersListPage` = 실제 처리 목록 (getOrders + updateOrderStatus + NEXT_STATUS). **redirect 아님, 실 컴포넌트.**
- `App.tsx:1163` `/workspace/supplier/orders` → `Navigate to="/supplier/orders"` — 무관(레거시셸), 본 수정 대상 아님·영향 없음.

→ CTA 목적지 = `/account/supplier/orders` 확정.

## 3. 적용한 수정 (2개 파일 · 최소 diff)

### 3.1 SupplierSupplyOffersPage.tsx — "판매자 모집" stub → 작동 카드

- 대시 border → 실 카드 스타일(다른 2개 카드와 동일: `border-slate-200 bg-white`).
- "준비 중" 배지 제거.
- 아이콘/제목 색상 활성화(`text-blue-600` / `text-slate-800`).
- 설명 문구를 실기능 반영으로 갱신("모집 상태·신청 현황·서비스 노출 승인을 관리합니다").
- CTA 추가: `<Link to="/supplier/recruitments">` "판매자 모집 현황으로 이동" (기존 `Link`·`ArrowRight` import 재사용, 신규 import 0).

### 3.2 SupplierOrdersPage.tsx — 자기참조 CTA 목적지 교정

- `<Link to="/supplier/orders">` → `<Link to="/account/supplier/orders">` (1줄).
- 주석에 근거 WO 명시. markup·스타일·주변 UnifiedOrdersSection 무변경.

## 4. 검증

| 검증 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` (@o4o/web-neture) | ✅ EXIT 0 |
| `pnpm --filter @o4o/web-neture build` | ✅ EXIT 0 (13.99s) |
| 신규 import / dependency | ✅ 0 (기존 `Link`/`ArrowRight` 재사용) |
| redirect loop | ✅ 0 (목적지 `/supplier/recruitments`·`/account/supplier/orders` 모두 실 컴포넌트, self-ref 아님) |
| 권한 회귀 | ✅ 0 (SupplierRoute·SUPPLIER_ROLES·guard 무변경. 목적지 route는 동일 `/supplier/*`·`/account/supplier/*` 트리 내부, 신규 가드 도입 없음) |
| 준비 중 stub | ✅ 0 |
| 자기참조 CTA | ✅ 0 |

## 5. 변경 없음 선언 (§13 제외 준수)

```
신규 오퍼 데이터모델/API 0 · distribution 상태머신 0 · 상품 가격정책 0 · 주문 상태머신 0 · 배송 엔진 0
/account/supplier/* 전체 통합 0 (후속 라우트트리 정합 버킷) · 대시보드 재설계 0
공통 role constants 변경 0 · DB write 0 · migration 0 · 운영 주문 mutation 0 · dependency 추가 0
```

## 6. 후속 (범위 밖 · 별도 버킷)

- **B 라우트트리 정합**: `/supplier/*` ↔ `/account/supplier/*` 이중 주문 화면(운영 허브 vs 처리 목록) 통합은 별도 WO. 본 WO는 CTA를 실제 처리 목록으로 연결하는 최소 안전 변경만 수행.
- 오퍼 모드 선택 전용 화면(WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1)은 원 파일 헤더가 예약한 후속.

## 7. commit 범위

path-specific stage + `git commit -m <msg> -- <paths>`. 대상 3파일:
`SupplierSupplyOffersPage.tsx` / `SupplierOrdersPage.tsx` / 본 CHECK. `git diff --cached --name-only`로 타 세션 staged 파일(otc-*/hff-*/pnpm-lock) 혼입 0 사전 확인.

---

*결과: GREEN · 준비 중 stub 0 · 자기참조 CTA 0 · 실제 유통·주문 처리 화면 도달 · typecheck/build EXIT 0 · redirect loop 0 · 권한 회귀 0 · DB write/migration 0*
