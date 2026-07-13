# CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-CONFLICT-POLICY-V1

> 같은 (master, STORE, 언어) 에 이미 canonical 이 있으면 새 공급자 STORE 설명서 **승인 차단**. 교체는 별도 WO.

## 1. 최종 정책

```
기존 STORE canonical 없음 → 승인 가능
기존 STORE canonical 있음 → 승인 불가(운영자 안내) · 수정 요청은 계속 가능
```

- V1 목적 = **충돌 방지**. 교체 / 기존 canonical archive·hidden / canonical history 는 **하지 않는다**(후속 `...-CANONICAL-REPLACE-V1`).
- DB unique violation 으로 터뜨리지 않고 **승인 전에 명시적 차단**(409).

## 2. 충돌 기준

```sql
cc.master_id = target.master_id
AND cc.description_type = 'STORE'
AND COALESCE(cc.language,'ko') = COALESCE(target.language,'ko')
AND cc.status = 'canonical'
AND cc.deleted_at IS NULL
AND cc.id <> target.id
```

- 승인 대상 자신이 canonical 인 경우는 `cc.id <> spd.id` 로 제외(충돌 아님).
- partial-unique(`uniq_..._per_master_type_lang`) 상 (master,STORE,lang) canonical 은 최대 1건 → conflict LEFT JOIN 은 1:1(목록 count 무영향).

## 3. 백엔드 차단 방식

- `POST /api/v1/admin/o4o-product-db/supplier-store-descriptions/:id/approve` 는 `setCanonical` 호출 전에 `getSupplierStoreReviewDetail` 의 `hasCanonicalConflict` 를 확인.
- 충돌 시 **409**:
  ```json
  { "success": false, "code": "CANONICAL_CONFLICT",
    "error": "이미 승인된 매장용 설명서가 있습니다. 기존 설명서 교체 기능은 별도 작업으로 제공됩니다.",
    "existingCanonicalId": "..." }
  ```
- 서비스 `listSupplierStoreReview` / `getSupplierStoreReviewDetail` 에 conflict LEFT JOIN(`cc`) 추가 → `hasCanonicalConflict`, `existingCanonicalId`(+detail: `existingCanonicalUpdatedAt`, `existingCanonicalSourceType`). read-only, 신규 write/컬럼/인덱스 없음.

## 4. 운영자 UI 표시 방식

- 목록 상태 셀: 충돌 행에 `승인 충돌` 빨강 배지(AlertTriangle). 승인 버튼 **비활성**(title 안내).
- 상세 모달: 충돌 배너("이미 승인된 매장용 설명서가 있어 승인할 수 없습니다 … 수정 요청으로 보완 요청 가능") + 승인 버튼 **비활성**.
- API 방어와 이중: UI 사전 차단 + 서버 409. UI 우회로 승인 시도해도 409 → 이해 가능한 toast.
- **수정 요청은 충돌과 무관하게 계속 가능**(승인만 차단).

## 5. canonical unique index 변경 없음

- DB 제약·인덱스 무변경. 업무 레벨(승인 전) 차단만. **migration 없음.**

## 6. 기존 canonical 수정 0

- 기존 canonical row 상태/값 변경 없음. hidden/archive/교체 없음.

## 7. AUTO-CREDIT / QR / product landing / tablet 미변경

- `resolveSupplierCredit` · `source_ref_id` · `created_by_supplier_id` 무접촉. QR/`/p/{key}`/tablet/매장 복사본/resource/POP 무변경.

## 8. typecheck / build 결과

- api-server `tsconfig.build.json` **0 error** · admin-dashboard `tsc --noEmit` **0 error** · web-neture `tsc --noEmit` **0 error**(무변경).

## 9. 배포 결과

- (main push → API/Admin 배포 결과 기록. web-neture 무변경. migration 없음.)

## 10. 실브라우저 smoke 결과

- (충돌 없음 승인 / 충돌 있음 승인 차단(UI 비활성 + API 409) / 수정 요청 가능 기록.)

## 11. 테스트 데이터 정리 결과

- (`[SMOKE]`. SPD/master/offer/기존 canonical id·충돌 대상 id·status 전이·정리 여부 기록.)

## 12. 변경 파일 목록

- `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` — list/detail conflict LEFT JOIN + 인터페이스 필드
- `apps/api-server/src/modules/neture/controllers/operator-supplier-store-description-review.controller.ts` — approve 409 CANONICAL_CONFLICT
- `apps/admin-dashboard/src/api/supplier-store-description-review.api.ts` — 타입 conflict 필드
- `apps/admin-dashboard/src/pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx` — 충돌 배지·승인 비활성·상세 배너·409 처리

## 13. commit SHA

- 구현: (기록)
- 배포/smoke: (기록)

## 14. push 결과

- (기록)

## 완료 판정

- (구현·정적검증·배포·smoke 후 CLOSED/PASS)

## 후속 WO

- `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-V1` — 기존 canonical 교체(기존 처리/새 승격/매장 복사본·QR·landing 영향 분석).
- `WO-O4O-SPD-REVISION-REQUEST-EXPIRY-SCHEDULER-V1` — revision_requested 만료 자동삭제 cron 등록.
