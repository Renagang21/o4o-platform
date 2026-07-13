# CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-APPLY-V1

> 기존 STORE canonical 이 있어도 운영자가 명시 확인(replaceExisting)하면 교체(기존→hidden, 대상→canonical).
> 설계: `CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-DESIGN-V1.md`

## 1. 최종 정책

```
기존 STORE canonical 없음 → 기존대로 승인(canonical)
기존 STORE canonical 있음 + replaceExisting!==true → 계속 409 CANONICAL_CONFLICT
기존 STORE canonical 있음 + replaceExisting===true → 기존 canonical=hidden, 대상=canonical (단일 트랜잭션)
매장 import 사본(kpa_store_contents) 자동 갱신 없음 (매장 소유 스냅샷)
```

## 2. replaceExisting API 계약

- `POST /api/v1/admin/o4o-product-db/supplier-store-descriptions/:id/approve` body `{ replaceExisting?: boolean }`.
- **boolean `true` 만 허용**: `const replaceExisting = req.body?.replaceExisting === true`. `undefined`/`null`/`false`/`"true"`(문자열)/`1` 은 전부 false 취급 → 충돌 시 409 유지.
- 충돌 없음: replaceExisting 무관하게 승인(setCanonical, 기본 demote=candidate — 강등 대상 없음).
- 응답 data: `{ id, status, curatedAt, replaced, previousCanonicalId }`.

## 3. 트랜잭션 처리 방식

- `setCanonical(id, actor, { demotedStatus })` 재사용 — 기존 replace-by-demotion 트랜잭션에 **강등 상태 파라미터만 추가**(기본 'candidate', 교체 경로만 'hidden').
- 단일 트랜잭션: 기존 canonical UPDATE→hidden 이 대상 승격 save 보다 **먼저** 실행 → partial-unique `uniq_..._per_master_type_lang` 위반 없음. 둘 다 성공 또는 둘 다 실패.
- **기존 setCanonical 호출자 무영향**: product-master-description.controller(관리자 직접 STORE upsert)는 opts 미전달 → 기본 candidate 강등 유지. 다른 description_type 승격도 무변경.

## 4. UI 확인 모달

- admin `O4O 상품 DB > 설명서 검수`: 충돌 행/상세에 **"기존 승인본 숨기고 교체"** 액션(amber, Replace 아이콘). 기본 승인 버튼은 충돌 시 계속 비활성.
- 확인 모달 문구: "교체하면 기존 승인본은 숨김 처리되고 이 제출 건이 새 공식 매장용 설명서로 승인됩니다. 매장이 이미 가져간 설명서는 자동으로 바뀌지 않습니다. Product Landing·QR·태블릿 live 참조는 새 설명서를 사용합니다." + 상품/새 공급자/제출일 + 기존 canonical id·sourceType·updatedAt 표시.
- 확인 시 `approveSupplierStoreReview(id, true)` → `{ replaceExisting: true }`.

## 5~12. 검증 (§13 smoke 참조)

- 충돌 없는 승인 / 충돌 기본 차단(409) / 교체 승인(hidden+canonical) / replaceExisting 엄격성 / 매장 사본 미변경 / landing·QR·tablet 미변경(코드 무접촉) / AUTO-CREDIT 미변경(canonical 행 per-row 기준 자동 전환) / 수정 요청 유지.

## 13. hidden 의미

교체 후 `hidden` = ①관리자 숨김/노출 중단 ②**canonical 교체로 더 이상 현재 승인본이 아닌 이전 승인본**. 공급자 수정 요청 상태는 여전히 `revision_requested`(hidden 아님).

## typecheck / build

- api-server `tsconfig.build.json` **0 error** · admin-dashboard `tsc --noEmit` **0 error** · web-neture 무변경. **migration 없음.**

## 배포 결과

- (main push → API/Admin 배포 결과 기록. web-neture 무변경.)

## 실브라우저 smoke 결과

- (충돌 없는 승인 / 충돌 기본 차단 409 / 교체 승인 → 기존 hidden·새 canonical / 수정 요청 가능 기록.)

## 테스트 데이터 정리 결과

- (`[SMOKE]`. 기존 canonical/신규 SPD/master/offer id·status 전이·정리 기록.)

## 변경 파일 목록

- `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` — setCanonical `demotedStatus` 옵션(기본 candidate)
- `apps/api-server/src/modules/neture/controllers/operator-supplier-store-description-review.controller.ts` — approve replaceExisting(엄격 boolean) → setCanonical demotedStatus:'hidden'
- `apps/admin-dashboard/src/api/supplier-store-description-review.api.ts` — approve replaceExisting 파라미터
- `apps/admin-dashboard/src/pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx` — 교체 버튼(행/상세)+확인 모달

## commit SHA / push

- (기록)

## 완료 판정

- (구현·정적검증·배포·smoke 후 CLOSED/PASS)

## 후속 WO

- `WO-O4O-STORE-CONTENT-IMPORTED-DESCRIPTION-SOURCE-UPDATE-BADGE-V1` — 매장 import 사본 "원본 갱신됨" 감지 배지(자동갱신 아님).
- `WO-O4O-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1` — 교체 감사 로그(주체/시각/전후 id).
