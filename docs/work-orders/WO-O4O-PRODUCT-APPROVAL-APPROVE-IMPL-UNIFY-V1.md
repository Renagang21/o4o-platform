# WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1

> **유형:** 구현 (backend approve 구현 canonical 통일)
> **선행 IR:** `IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1` (+ `IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1`)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1.md`

---

## 1. 목적
Supply Catalog 신청 승인의 approve 구현을 `ProductApprovalV2Service` 중심으로 통일. KPA의 직접 SQL approve를 V2 service로 흡수하고, 승인 시 `OrganizationProductListing.is_active=true`를 canonical로 만든다. **GP/KCos 승인 surface enable 전에 approve 구현 통일을 먼저 한다.** 승인 surface 확장이 아니라 approve 구현 정리가 목적.

## 2. 핵심 원칙
1. KPA direct SQL approve → `approveServiceProduct()` 호출로 전환
2. `approveServiceProduct()`에 `activateListing` 옵션 추가
3. operator 승인 경로 = `activateListing=true`
4. 기존 internal/V2 경로가 active=false를 기대하면 보존 (옵션 기본 false)
5. 승인 시 OPL active=true = "내 매장 O4O 주문 가능 상품 편입 자격"
6. 소비자 storefront 진열은 `OPC.is_active + channel APPROVED` 별도 gate 유지
7. GP/KCos operator 승인 surface 미추가
8. KPA 메뉴 노출 미포함

## 3. 작업 대상
`apps/api-server/**`, CHECK 문서. **frontend 수정 없음.**

## 4. 제외
GP/KCos 승인 route·UI / KPA 사이드바 메뉴 / `ProductApplicationManagementPage` 공통추출 / storefront 진열 정책 / channel approval 정책 / OPC 생성·활성 정책 / 신청·offer schema / **DB migration**.

## 5. 현재 구현 (조사)
### 5.1 KPA direct SQL approve — `routes/kpa/controllers/operator-product-applications.controller.ts`
- `PATCH /:id/approve`: ① product_approvals PENDING 조회 ② UPDATE→approved ③ 단건 OPL UPSERT(is_active=true, `SAVEPOINT upsert_listing` FK 가드) ④ **동일 offer+serviceKey OPL 일괄 active=true**(offer-wide bulk)
- `POST /batch-approve`: 동일 로직 inline 반복
- `PATCH /:id/reject`, `batch-reject`: 이미 `approvalV2Service.rejectServiceApproval()` 사용 ✅

### 5.2 `ProductApprovalV2Service.approveServiceProduct(approvalId, approvedBy)` — `modules/product-policy-v2/product-approval-v2.service.ts`
- 트랜잭션: approval(PENDING+SERVICE) 조회 → offer 조회 → supplier ACTIVE 재검증 → PENDING→APPROVED → listing 생성(중복 시 23505 tolerant)
- **신규 listing `is_active: false`**, 기존 listing 미변경. options 없음.
- 반환 `{ success, data: { approval, listing }, error }`

## 6. 구현 방향
### 6.1 approve 옵션 추가
```ts
interface ApproveServiceProductOptions {
  activateListing?: boolean;       // 단건 OPL 활성 (operator 경로 true)
  activateOfferListings?: boolean; // 동일 offer+serviceKey OPL 일괄 활성 (legacy KPA parity, 기본 false)
}
approveServiceProduct(approvalId, approvedBy, options = {})
```
기본값 둘 다 false → 기존 internal/V2 호출부 동작(active=false) 보존. operator 경로만 `activateListing=true`.
`activateListing=true` 시 단건 OPL은 KPA와 동일하게 **SAVEPOINT FK-tolerant UPSERT(is_active=true)** 로 처리(bridge 승인 FK 위반에도 approval 커밋 보존).

## 7. offer listings 일괄활성 sub-decision — **결정: Option A (단건 OPL만)**
KPA 현재 direct SQL은 offer-wide 일괄(Option B). 그러나 각 org는 **자신의 approval 레코드**를 가지므로, approve 1건이 미승인 sibling org listing까지 켜는 것은 IR이 경고한 drift(승인 의미 확대).
- **채택: Option A** — 승인 대상 organization 단건 OPL만 active. per-store 승인 의미 명확, GP/KCos 확장 시 예측 가능, auto-expansion 오활성 위험 제거.
- `activateOfferListings`(Option B)는 service에 **구현은 하되 operator 경로에서 미사용**(향후 필요 시 1-line 전환 가능, reversible).
- **KPA 동작 변경:** approve 시 offer-wide 일괄 활성 → 단건 활성으로 축소. (각 org는 각자 approval 승인 시 활성. 더 정확한 per-store 모델.) CHECK에 명시.

## 8. KPA controller 전환
`PATCH /:id/approve` + `POST /batch-approve`의 direct SQL 제거 → `approvalV2Service.approveServiceProduct(id, approvedBy, { activateListing: true })` 호출.
- request validation·권한 guard 유지 · 성공 response shape 가능한 한 유지 · 실패 error code 유지(`APPROVAL_NOT_FOUND_OR_NOT_PENDING` 404)
- reject·list·stats·delete·batch-delete·batch-reject 변경 없음
- actionLog 유지

## 9. active 정책
승인 후 `OrganizationProductListing.is_active = true` = "내 매장 O4O 주문 가능 상품 편입 자격". 소비자 storefront 진열(`OPC.is_active + channel APPROVED`)과 혼동 금지 — 이번 작업에서 storefront 노출 조건 미완화.

## 10. 회귀 방지
KPA approve route/response 유지 · reject 동작 유지 · 상태 전이 유지 · 승인=OPL active=true · storefront gate 불변 · internal V2 호출부 active=false 보존 · GP/KCos route/UI 미추가 · **DB migration 없음**.

## 11~12. 검증/Smoke
backend tsc 통과 · KPA approve/reject/internal V2 호출부 compile · direct SQL 제거 확인 · operator approve `activateListing=true` · internal 기본 동작 보존 · storefront 미수정 · GP/KCos frontend 미수정 · migration 없음. 가능 시 KPA approve smoke(pending 1건 approve→approved+OPL active=true). prod 데이터 영향 신중, 테스트 신청 없으면 write smoke 생략·사유 기록.

## 13. staged 가드
허용: `apps/api-server/**`, CHECK. **금지: `services/web-*/**`.** commit 명시 경로.

## 14. CHECK 문서
`docs/checks/CHECK-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1.md` — 목적·IR 반영·service 변경·activateListing 동작·activateOfferListings 결정 사유·KPA direct SQL 흡수·route/response 유지·reject 유지·OPL active 정책·storefront 미수정·GP/KCos 미추가·migration 없음·검증·smoke·commit hash.

## 15. 배포
backend 변경 → API Server 배포. migration 없음 → migration job 신규 대상 없음 확인.

## 16. 후속
1. `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1`
2. `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1`
3. `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` (OPL active ⊥ storefront gate 정책 고정)

---

*End of WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1*
