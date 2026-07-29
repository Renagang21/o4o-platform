# CHECK — O4O Neture 공급자 승인 콘솔 · Admin Governance 분리 V1

**WO:** WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1
**작성일:** 2026-07-29
**판정:** IMPLEMENTED — 주문·정산 가드 + 재활성화 계약 포함 단일 배포

---

## 1. 목적 (요약)

공급자 상태 관리 축을 두 콘솔로 분리한다.

| 축 | 화면 | 대상 상태 | 액션 | 권한 |
|----|------|-----------|------|------|
| 승인 (canonical) | `/operator/suppliers` | PENDING | 승인 / 거절 (단건+일괄) · 검색·필터·페이지네이션 · 인라인 기본정보 보완 | operator |
| 상태 관리 (governance) | `/admin/supplier-governance` | ACTIVE / INACTIVE | 비활성화 / 재활성화 | admin 전용 |

admin 화면에서 승인/거절 중복을 제거하고, 운영자 화면에서 비활성화/재활성화를 금지한다.

---

## 2. 체크리스트 (19)

| # | 항목 | 근거 | 결과 |
|---|------|------|:----:|
| 1 | admin 승인/거절 중복 제거 — 구 `AdminSupplierApprovalPage` 삭제, governance 전용 신규 페이지 | `services/web-neture/src/pages/admin/AdminSupplierGovernancePage.tsx` (신규) · 구 페이지 삭제 | ✅ |
| 2 | `/admin/admin-suppliers` → `/admin/supplier-governance` `replace` redirect | `App.tsx` `<Navigate to="/admin/supplier-governance" replace />` | ✅ |
| 3 | 신규 라우트 `/admin/supplier-governance` 등록 | `App.tsx` | ✅ |
| 4 | 메뉴명 "공급자 상태 관리" / `/admin/supplier-governance` | `config/operatorMenuGroups.ts` approvals | ✅ |
| 5 | governance 목록 컬럼: 공급자명 / 현재 상태 / 최근 상태 변경일 / 최근 변경자 / 최근 변경 사유 / 진행 주문 여부 / 미정산 여부 / 상태 변경 액션 | governance 페이지 `columns` | ✅ |
| 6 | governance 대상 ACTIVE / INACTIVE 만 (PENDING/REJECTED 제외) | `getGovernanceSuppliers()` where `[ACTIVE, INACTIVE]` | ✅ |
| 7 | operator 승인 콘솔 비활성화/재활성화 미노출 유지 | `OperatorSupplierApprovalPage.tsx` (deactivate 액션 미노출 명시) | ✅ |
| 8 | 비활성화 `POST /neture/admin/suppliers/:id/deactivate` — neture:admin, ACTIVE-only, 사유 필수 | `admin.controller.ts` + `supplier.service.ts deactivateSupplier` | ✅ |
| 9 | 서버 재검증 + 트랜잭션 + `FOR UPDATE` 상태 재확인 | `deactivateSupplier` `AppDataSource.transaction` + `SELECT ... FOR UPDATE` | ✅ |
| 10 | 진행 주문/미정산/정산 진행 → `409 SUPPLIER_DEACTIVATION_BLOCKED` + `activeOrderCount`/`unsettledCount`/`settlementInProgressCount` (강제 override 없음) | `admin.controller.ts` 409 분기 + `countSupplierObligations` | ✅ |
| 11 | 재활성화 `POST /neture/admin/suppliers/:id/reactivate` — neture:admin, INACTIVE-only, 사유 필수, 트랜잭션, 감사 | `reactivateSupplier` | ✅ |
| 12 | 재활성화 복구 범위: supplier ACTIVE · organization active · membership active · supplier role — 상품 승인/진열/HUB 게시는 자동 복구 안 함 | `reactivateSupplier` (승인/진열/게시 미복구) | ✅ |
| 13 | role 쓰기는 `roleAssignmentService` 통해 커밋 후 수행 (F9 RBAC SSOT · 부분 성공 방지) | `deactivate/reactivate` `.then()` post-commit | ✅ |
| 14 | 감사 `action_key` = `neture.admin.supplier_deactivate` / `neture.admin.supplier_reactivate`, meta = supplierId/previousStatus/nextStatus/reason/affectedOrganizationId/actorRole/guard counts — 연락처/토큰/전체 프로필/주문 상세 미기록 | `admin.controller.ts logSuccess` | ✅ |
| 15 | `window.confirm` 미사용 — 표준 `ConfirmActionDialog`(사유 필수) 재사용, impact/비복구 안내를 message 에 구성, 오픈 시 대상 스냅샷, 취소=변경 0 | governance 페이지 dialog | ✅ |
| 16 | 권한: supplier/partner/seller 전면 차단, operator 는 승인/거절만(deactivate/reactivate 403), neture admin 만 비활성화/재활성화 — role 상수 미확장 | `requireNetureScope('neture:admin')` guard | ✅ |
| 17 | web-neture `tsc --noEmit` PASS | 실행 로그 (무출력=clean) | ✅ |
| 18 | web-neture / api-server `build` PASS | vite `✓ built` · tsc build 무오류 | ✅ |
| 19 | api-server `tsc` — 수정 파일 무오류 (기존 `src/scripts/*` 사전 오류만 잔존) | grep 필터 결과 | ✅ |

---

## 3. 변경 파일

**Backend**
- `apps/api-server/src/modules/neture/services/supplier.service.ts` — `deactivateSupplier`(tx+가드) 재작성 · `reactivateSupplier` 신규 · `countSupplierObligations` 신규 · `getGovernanceSuppliers` 신규 · `SupplierObligationGuard`/`GovernanceSupplierRow` 인터페이스
- `apps/api-server/src/modules/neture/neture.service.ts` — 위임 3종
- `apps/api-server/src/modules/neture/controllers/admin.controller.ts` — `GET /suppliers/governance` · `POST /suppliers/:id/deactivate`(사유+409) · `POST /suppliers/:id/reactivate` · §9 감사 meta
- `apps/api-server/src/modules/neture/controllers/neture-tier1-test.controller.ts` — deactivate 호출에 기본 사유 인자 추가(테스트 컨트롤러 시그니처 정합)

**Frontend**
- `services/web-neture/src/pages/admin/AdminSupplierGovernancePage.tsx` — 신규 governance 전용 페이지
- `services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx` — 삭제
- `services/web-neture/src/lib/api/admin.ts` — `getGovernanceSuppliers`/`deactivateSupplier(reason)`/`reactivateSupplier(reason)` + `SupplierGovernanceResult`/`GovernanceSupplier` 타입
- `services/web-neture/src/lib/api/index.ts` — 신규 타입 export
- `services/web-neture/src/App.tsx` — lazy import 교체 · redirect + 신규 라우트
- `services/web-neture/src/config/operatorMenuGroups.ts` — 메뉴명/경로 변경

---

## 4. 주문·정산 가드 근거 (canonical join)

```
-- 진행 주문 (neture_orders 비종결)
FROM neture_orders o
JOIN neture.neture_order_items oi ON oi.order_id = o.id
JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
WHERE spo.supplier_id = $1
  AND o.status IN ('created','pending_payment','paid','preparing','shipped')

-- 결제완료·미브릿지 checkout_orders
FROM checkout_orders co
WHERE co."supplierId" = $1 AND co."paymentStatus" = 'paid'
  AND NOT EXISTS (SELECT 1 FROM neture_orders no2 WHERE no2.metadata->>'checkoutOrderId' = co.id::text)

-- 미정산 / 정산 진행
FROM neture_settlements WHERE supplier_id = $1 AND status IN ('pending','calculated','approved')  -- 미정산
FROM neture_settlements WHERE supplier_id = $1 AND status IN ('calculated','approved')            -- 정산 진행
```

- `neture_order_items` 는 `neture` 스키마 (프리픽스 필수). 그 외 `neture_orders`/`supplier_product_offers`/`neture_settlements`/`checkout_orders` 는 `public`.

---

## 5. 프로덕션 read-only smoke (§14) — 2026-07-29 수행

배포: **API `o4o-core-api-02985-sc2` (serving) · neture-web 재배포 success** (커밋 cb4dbf9d7).
프로덕션 공급자 상태는 변경하지 않음 (read-only).

| 검증 | 방법 | 결과 |
|------|------|:----:|
| `GET /neture/admin/suppliers/governance` 배포됨 | 무인증 probe → `401`(NOT 404) | ✅ |
| `POST /neture/admin/suppliers/:id/deactivate` 배포됨 | 무인증 probe → `401`(NOT 404) | ✅ |
| `POST /neture/admin/suppliers/:id/reactivate` 배포됨 (신규) | 무인증 probe → `401`(NOT 404) | ✅ |
| neture-web 번들에 `/admin/supplier-governance` 라우트 + redirect | 배포 index chunk grep: `supplier-governance`×3, `admin-suppliers`×1, `AdminSupplierGovernance`×2 | ✅ |
| 구 `AdminSupplierApprovalPage` 제거 반영 | 배포 번들 grep: `AdminSupplierApproval` 0건 | ✅ |

**브라우저 UI smoke (로그인 후 화면 관측):** 로컬 Playwright 프로필이 타 Chrome 세션 점유로 실행 불가 → HTTP/번들 레벨 read-only 검증으로 대체. 로그인 화면 관측 항목(redirect 시각 확인 / 8컬럼 렌더 / operator 비활성화 미노출 / 사유 필수 다이얼로그 취소=변경 0)은 브라우저 가용 시 후속 관측 권장. 라우트·엔드포인트·번들 반영은 위 표로 확인됨.
