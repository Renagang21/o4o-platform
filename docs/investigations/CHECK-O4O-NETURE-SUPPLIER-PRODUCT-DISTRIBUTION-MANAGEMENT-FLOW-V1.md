# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1 (후보 D)
> **유형:** backend(정책 + 정식 API) + frontend(관리 플로우). **migration 불필요**(approval_status=VARCHAR, 제약 없음).
> **결과(Phase 1 backend): PASS(코드/타입) — serviceKeys 정식 변경 API(`PATCH /supplier/products/:id/distribution`) + SERVICE 제거='cancelled'(삭제 금지)+listing 비활성 + 추가=pending/재심사(cancelled→pending) + 파생 재동기화(cancelled 제외). api-server tsc 0. Phase 2(frontend 관리 모달 + drawer auto-submit 우회 제거)는 후속.**
> 선행: IR-O4O-NETURE-SUPPLIER-SERVICE-REMOVAL-POLICY-AUDIT-V1 · CHECK-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1 — 2026-06-19

---

## 0. migration 판정 (중단 기준 해소)

- `offer_service_approvals.approval_status` = **VARCHAR(20), enum/check 제약 없음**(`20260325300000-CreateOfferServiceApprovals.ts:12`, index만). → **'cancelled'(9자) 추가는 migration 불필요, 코드 only.**
- listing↔serviceKey 매핑 명확: `organization_product_listings.service_key` = offer serviceKey(auto-listing.utils). → 제거 시 `WHERE offer_id+service_key` is_active=false 안전.
- → WO §9 중단기준(enum 위험/listing 매핑 불명확/listing 비활성 기준) **모두 비해당.**

## 1. 확정 정책 (IR 반영)

- catalog 노출 SSOT = `offer_service_approvals` approved row(service_keys 배열 아님). → SERVICE 제거 시 **approval row를 approved에서 빼야** 노출 제외됨.
- SERVICE 제거 = `approval_status='cancelled'`(row 보존) + 해당 listing 비활성. catalog 게이트(approved만)가 cancelled 자연 제외 → **게이트 무변경**.
- SERVICE 추가/재추가 = pending(cancelled/rejected→pending 재심사). **자동 approved 복구 금지.**
- PUBLIC = 승인 무관(게이트 예외) 유지.

## 2. Phase 1 변경 파일 (backend 4)

| 파일 | 변경 |
|------|------|
| `offer-service-approval.service.ts` | `createPendingApprovals`: executor 파라미터 + ON CONFLICT 재심사에 **'cancelled' 추가**. `syncOfferFromServiceApprovals`: **cancelled 제외 파생**(all-cancelled 시 상태 무변경). **`cancelServiceApprovals`** 신규(cancelled 전환 + listing 비활성). |
| `offer.service.ts` | **`updateDistribution`** 신규 — serviceKeys diff(추가=pending, 제거=cancelled+listing) + is_public/distribution_type 갱신 + 파생 재동기화(트랜잭션). |
| `neture.service.ts` | `updateDistribution` delegate. |
| `supplier-product.controller.ts` | **`PATCH /supplier/products/:id/distribution`**(requireActiveSupplier) 라우트. |

> DB/migration 0. 기존 createPendingApprovals/sync는 cancelled 행이 없던 기존 흐름에 **동작 불변**(additive). catalog 게이트·auto-listing·승인/반려 경로 무변경.

## 3. SERVICE 추가/제거 처리 (정식)

- **추가**: `createPendingApprovals(offerId, added, tx)` — 없음→pending INSERT, rejected/cancelled→pending reset, pending/approved 보존.
- **제거**: `cancelServiceApprovals(offerId, removed, tx)` — (offer_id, service_key) status `pending/approved/rejected → 'cancelled'`(reason 기록, **삭제 금지**) + `organization_product_listings` 해당 serviceKey `is_active=false`(삭제 금지). `decided_by`는 운영자 FK 의미라 변경 안 함(공급자 actor 필드 부재 — reason/decided_at만).
- **파생 재동기화**: `syncOfferFromServiceApprovals` — cancelled 제외 후 anyApproved→APPROVED / hasPending→PENDING / all-cancelled→상태 무변경 / 그 외→REJECTED.

## 4. API 계약

`PATCH /api/v1/neture/supplier/products/:id/distribution` (requireActiveSupplier)
```json
{ "isPublic": false, "serviceKeys": ["kpa-society", "glycopharm"] }
```
- serviceKeys는 `filterApprovalEligibleServiceKeys`(SSOT: kpa-society/glycopharm/k-cosmetics)로 검증. 소유권(NOT_OWNED 403)·존재(OFFER_NOT_FOUND 404) 가드.
- 응답: `{ success, data: { isPublic, serviceKeys, distributionType, added, removed, addedResult, removedResult, sync } }`.

## 5. 검증 (Phase 1)

- **api-server `tsc --noEmit`: EXIT 0.**
- 정적: 트랜잭션(queryRunner) 일괄, executor 전파로 tx 일관성. eligible 필터로 잘못된 키 차단. 기존 흐름 cancelled 부재 시 불변.

### 배포 후 API smoke (Phase 1) — 2026-06-19 **PASS** (실 API, 인증 fetch)

- **방식(비파괴)**: ACTIVE 공급자(renagang21) 미네락 600 offer(이미 kpa-society/glycopharm approved, PUBLIC)에 **현재 없는 서비스 `k-cosmetics`만 추가→제거→재추가→원복** — 기존 kpa/glyco/PUBLIC 불변. 종료 후 원상복구.
- **결과(`PATCH /supplier/products/:id/distribution` 응답)**:
  - **추가**: `added=["k-cosmetics"]`, `addedResult.insertedServiceKeys=["k-cosmetics"]` → **pending 신규**. offer 유지 APPROVED. ✅
  - **제거**: `removed=["k-cosmetics"]`, serviceKeys 복귀. ✅
  - **재추가**: `addedResult.resubmittedServiceKeys=["k-cosmetics"]` → **cancelled→pending 재심사**(ON CONFLICT WHERE 가 cancelled 매칭). 이는 **직전 제거가 실제로 cancelled 전환됐음을 증명**(pending 이었으면 resubmit=0, skip). **자동 approved 복구 없음.** ✅
  - **원복**: serviceKeys=[kpa-society, glycopharm], offer=APPROVED+PUBLIC 복귀(kpa/glyco 무결). ✅

| smoke | 결과 |
|------|:--:|
| 1. SERVICE 추가 → pending | **PASS** |
| 2. SERVICE 제거 → cancelled(재추가 resubmit로 입증) | **PASS** |
| 3. cancelled 재추가 → pending(approved 복구 없음) | **PASS** |
| 4. 기존 approved(kpa/glyco) 무결 + offer APPROVED 유지 | **PASS** |
| 5. PUBLIC 유지(distribution_type=PUBLIC) | **PASS** |
| 6. operator 승인→approved 후 제거(listing 비활성) | 미실행(운영자 자격 없음) — cancelServiceApprovals 가 approved 동일 처리(코드/typecheck) |

> **발견·수정**: `cancelServiceApprovals` 의 응답 필드(`cancelledServiceKeys`/`deactivatedListings`)가 **queryRunner `UPDATE...RETURNING` 컬럼 null/형식 이슈**로 잘못 파싱(`[null,null]`/오카운트). **실제 DB 전이는 정상**(재추가 resubmit로 입증)이나 보고 필드가 틀려 → **SELECT→UPDATE 안전 패턴으로 수정**(RETURNING 의존 제거, 사전 COUNT). api-server tsc 0. ← 본 CHECK 커밋에 포함.

## 6. Phase 2 (frontend) — 후속 (이번 커밋 미포함)

- ProductDetailDrawer/SupplierProductsPage: **공급 방식 관리 모달**(B2B 전체 공급 토글 + 서비스 대상 체크 + 정책 안내 + 저장→distribution API).
- PUBLIC 경고 / SERVICE 제거 확인(철회·재신청 안내) / cancelled='철회됨' 표시.
- **drawer auto submitForApproval 우회 정리**(상품 정보 저장과 공급 방식 변경 분리). 기존 상품 정보/설명/가격 편집 회귀 금지.
- 실브라우저 smoke(A 교훈) 후 CHECK 갱신.

## 7. 비범위 / 준수

- ✅ migration 0, catalog 게이트 무변경, approval row/listing/주문 **삭제 0**, PUBLIC 승인 게이트 추가 0, 이벤트오퍼/서비스별가격/PRIVATE 고도화 제외, 유통참여형 펀딩 미연결.
- ✅ path-specific(backend 4 + CHECK). 검증 png·다른 세션 WIP 미staging.

---

*Date: 2026-06-19 · Phase 1 backend · serviceKeys 정식 변경 API + SERVICE 제거='cancelled'(보존)+listing 비활성 + 추가=pending(cancelled→pending 재심사) + 파생 재동기화(cancelled 제외) · migration 0(approval_status VARCHAR) · catalog 게이트 무변경(approved만→cancelled 자연 제외) · api-server tsc 0 · Phase 2(frontend 관리 모달+auto-submit 정리) 후속.*
