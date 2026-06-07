# CHECK-O4O-NETURE-SUPPLIER-ORDER-WORKSPACE-IA-LINK-V1

> 이미 존재하는 `neture_orders` 기반 공급자 주문·배송 workspace를 supplier 공간(`/supplier/orders` 집계 허브)에서 진입하도록 IA 연결. **신규 주문 시스템 아님.**
>
> WO: `WO-O4O-NETURE-SUPPLIER-ORDER-WORKSPACE-IA-LINK-V1`
> 선행 IR: `IR-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-DESIGN-V1`
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료. **frontend only.**

---

## 1. §4.1 현재 동선 확인

| 항목 | 결과 |
|---|---|
| `/supplier/orders` (공간 메뉴) | SupplierOrdersPage = **집계 허브** (getOrdersSummary) |
| 실제 workspace | `/account/supplier/orders` (SupplierOrdersListPage) + `/account/supplier/orders/:id` (SupplierOrderDetailPage) — **이미 동작**(목록/상태변경/송장) |
| workspace 내부 링크 | `/account/supplier/orders[/:id]` **하드코딩** (standalone 렌더) |
| 동선 | 공간 메뉴 → 집계 허브에서 **끊김** (GAP) |

**안 결정:** workspace 페이지들이 `/account/...` 링크를 하드코딩하므로, `/supplier/orders`에서 그대로 재사용하면(안 A) 상세 클릭 시 account 영역으로 빠지는 **컨텍스트 불일치**가 생긴다. → **안 B 채택**: 집계 허브에 **워크스페이스 진입 CTA**를 추가(기존 workspace 그대로 활용, 링크/레이아웃 재작업 0, 라우트 중복 0).

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx` | 주문 처리·배송 workspace 진입 CTA(`Link → /account/supplier/orders`) + 한계 안내(이벤트 오퍼 checkout_orders 분리) + 스타일 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-ORDER-WORKSPACE-IA-LINK-V1.md` | 본 문서 |

> 백엔드/엔티티/API/migration/route 무변경. workspace 페이지(List/Detail) 무변경.

---

## 3. 구현 내용 (안 B)

- `/supplier/orders` 집계 허브 Stats 아래에 **"주문 처리 · 배송 workspace 열기"** CTA 카드 추가 → `/account/supplier/orders`(기존 동작 workspace) 진입.
- CTA 내 한계 안내: "Neture 주문의 주문 확인·배송 준비·송장 등록·배송 완료 처리. 이벤트 오퍼 주문은 별도 checkout_orders 기반이라 통합 표시는 주문 테이블 경계 정리 이후."
- workspace의 목록/상세/상태변경(created/paid→preparing→shipped→delivered)/송장(neture_shipments)은 **그대로 동작**(무변경).

---

## 4. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| `/supplier/orders` 진입 + CTA 렌더 | ✅ |
| CTA → `/account/supplier/orders` workspace 진입 | ✅ (기존 라우트) |
| 주문 목록/상세/상태/송장 기능 | ✅ 무변경 |
| supplier 권한 접근 | ✅ (기존 guard) |
| 직접 URL crash | ✅ 없음 |
| account workspace 영향 | ✅ 없음 |
| 제품/대량/이벤트/펀딩 흐름 | ✅ 무영향 |

---

## 5. What Was Not Changed (§5)

- ✅ 신규 주문 API/테이블/migration 없음
- ✅ neture_orders / checkout_orders 구조 무변경
- ✅ 이벤트 오퍼 주문 통합 없음 (checkout_orders 분리 유지)
- ✅ 배송비 계산/free shipping/정산/환불·취소/상태 enum/송장 API 무변경
- ✅ 유통참여형 펀딩 주문 연결 없음
- ✅ workspace 컴포넌트(List/Detail) 무변경 — 진입 CTA만 추가

---

## 6. 후속 과제 기록 (§8, §10-10)

> **주문 테이블 경계 결정이 다음 선행 과제.** workspace=`neture_orders`, 이벤트 오퍼/KPA·GP·K-Cos=`checkout_orders`로 분리되어 있어, **이벤트 오퍼 주문 포함**과 **배송비 계산 V2**는 경계 결정에 종속.

| WO/IR | 목적 |
|---|---|
| **IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1** (선행) | neture_orders ↔ checkout_orders 역할 경계, 이벤트 오퍼 포함 여부, 배송비 계산 대상 테이블 결정 |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2 | 경계 결정 후 정책 기반 배송비 계산 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 공급자 공간 → 주문·배송 workspace 진입 연결 완료. 이벤트 오퍼 포함·배송비 계산은 테이블 경계 IR 이후.
