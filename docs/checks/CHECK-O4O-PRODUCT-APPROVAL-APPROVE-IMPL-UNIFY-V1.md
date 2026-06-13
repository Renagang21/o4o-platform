# CHECK-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1

> **WO:** [WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1](../work-orders/WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1.md)
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — 구현 + tsc + 배포 + prod error-path smoke PASS. success-path write smoke는 pending 0건으로 생략(사유 §14).

## 1. 목적
Supply Catalog 승인 approve 구현을 `ProductApprovalV2Service` 중심으로 통일. KPA direct SQL approve 흡수, 승인 시 OPL `is_active=true` canonical화. GP/KCos surface enable 전 approve 구현 정리.

## 2. 선행 IR 결정 반영
per-store 승인(신청 매장 OPL 편입), OPL active=주문가능 자격(≠ storefront 진열), KPA direct SQL 폐기, surface 확장 전 구현 통일.

## 3. ProductApprovalV2Service 변경
- `approveServiceProduct(approvalId, approvedBy, options?)` — `ApproveServiceProductOptions { activateListing?, activateOfferListings? }` 추가(export).
- 기본값 둘 다 false → 기존 internal/V2 호출부 동작(listing `is_active=false`) **보존**.
- `activateListing=true`: 단건 OPL을 **SAVEPOINT FK-tolerant UPSERT(is_active=true)** 로 처리(KPA bridge 승인 FK 위반에도 approval 커밋 보존). 동일 SQL을 KPA direct SQL에서 흡수.
- `activateOfferListings=true`: 동일 offer+serviceKey OPL 일괄 활성(Option B) — 구현했으나 operator 경로 **미사용**.

## 4. activateListing 동작
operator 승인 경로(KPA approve/batch-approve)가 `{ activateListing: true }` 전달 → 승인 대상 organization 단건 OPL만 active=true.

## 5. activateOfferListings 결정 사유 (§7 sub-decision)
- **채택: Option A (단건 OPL만).** 각 organization은 자신의 approval 레코드를 가지므로, approve 1건이 미승인 sibling org listing까지 켜는 offer-wide 일괄(Option B)은 IR이 경고한 drift(승인 의미 확대).
- Option B는 service에 구현은 유지(향후 1-line 전환 가능, reversible)하되 operator 경로 미사용.
- **KPA 동작 변경:** 기존 direct SQL의 offer-wide 일괄 활성(line 184) → 단건 활성으로 축소. 각 org는 각자 approval 승인 시 활성(더 정확한 per-store 모델). prod 데이터 disposable 단계라 blast radius 낮음.

## 6. KPA direct SQL 제거/흡수
- `operator-product-applications.controller.ts`:
  - `PATCH /:id/approve`: direct SQL 트랜잭션(UPDATE + SAVEPOINT UPSERT + offer-wide UPDATE) 제거 → `approveServiceProduct(id, by, {activateListing:true})`.
  - `POST /batch-approve`: 동일 inline 로직 제거 → 동일 service 호출(batch-reject 패턴과 정렬).
- net -47 줄(direct SQL/SAVEPOINT/offer-wide 제거).

## 7. route/response 유지
- approve route `PATCH .../product-applications/:id/approve` 유지. 실패 404 `APPROVAL_NOT_FOUND_OR_NOT_PENDING` 유지.
- 성공 response: `{ approvalId, offerId, organizationId, listingActivated }` (기존 `activatedListings`/`listingUpserted` → `listingActivated`로 대체 — 단건 의미 반영. approvalId/offerId/organizationId 유지).
- 권한 guard(`kpa:operator`)·actionLog 유지.

## 8. reject 유지
`PATCH /:id/reject`·`batch-reject`는 기존 `rejectServiceApproval()` 그대로. 변경 없음. list/stats/delete/batch-delete 변경 없음.

## 9. OPL active 정책
승인 후 `is_active=true` = 내 매장 O4O 주문 가능 상품 편입 자격. storefront 진열(`OPC.is_active + channel APPROVED`)과 분리 — 이번 작업 미수정.

## 10. storefront gate 미수정
OPC/channel approval 관련 코드 무수정.

## 11. GP/KCos surface 미추가
GP/KCos operator 승인 route/UI 미추가. frontend 무수정(`services/web-*` 0건).

## 12. DB migration 없음
신규 migration 0건. 배포 후 migration job: `Migrations executed: 0`, `No migrations are pending` 확인.

## 13. 정적 검증
- api-server `tsc --noEmit` ✅ **0 errors**.
- 기존 호출부 호환: `internal.routes.ts:120`, `admin.controller.ts:732` (둘 다 2-arg → options={} → active=false 보존). approve/reject/internal compile 통과.
- **추가 behavior:** V2 service approve는 KPA direct SQL에 없던 **Supplier ACTIVE 재검증**을 포함(SUPPLIER_NOT_ACTIVE 시 실패). canonical V2 동작 채택(reject도 이미 V2 사용) — 더 엄격·정확. CHECK 명시.

## 14. Smoke (prod, API 레벨)
| 항목 | 결과 |
|------|------|
| 로그인(kpa:operator) | ✅ |
| 목록 endpoint(read-only) | ✅ success, pending **0건** |
| 존재하지 않는 uuid approve | ✅ HTTP **404 `APPROVAL_NOT_FOUND_OR_NOT_PENDING`** (refactored 경로 end-to-end, 데이터 무변경) |
| success-path write smoke | ⏭️ **생략** — pending 0건(실데이터 없음) + 합성 prod approval 생성은 동시 세션의 product-approval 작업 간섭 위험. WO §12 허용. success 경로는 동일 SAVEPOINT UPSERT SQL 재사용(prod 검증된 KPA 로직) + tsc + error-path live로 갈음. |

## 15. 배포
- Deploy API Server (Cloud Run) ✅ success (`dc2153b67`). migration job 신규 대상 없음.
- frontend 변경 없음 → web 배포 불필요.

## 16. Commit
- WO 문서: `7a9b06cbc`. 코드 2파일: `dc2153b67`. 본 CHECK: 별도 path-specific commit.

## 17. 후속
1. `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1`
2. `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1`
3. `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1`

---
*End of CHECK-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1*
