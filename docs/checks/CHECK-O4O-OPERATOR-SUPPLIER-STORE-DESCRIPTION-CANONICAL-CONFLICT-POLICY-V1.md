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

- main push `198520542` → **API Server / Admin Dashboard 배포 success** (2026-07-13). web-neture 무변경(미배포). **migration 없음**.
- 신규 엔드포인트 회귀 없음(approve 는 기존 경로에 conflict 가드 추가).

## 10. 실브라우저 smoke 결과 (prod, 2026-07-13)

전 과정 **PASS**. 공급자(renagang21=(주)네뚜레 공급자 테스트) 단일 계정으로 canonical 충돌 시나리오 구성.

smoke 데이터: 상품 `[SMOKE] canonical 충돌 검증 상품`(barcode 8809178391215) · offer `50ab2cb7-...` · master `1b64db18-...` · SPD#1 `01b1df74-...` · SPD#2 `49ae8136-...`.

1. **충돌 없음 승인**: SPD#1(needs_review) 승인 전 `hasCanonicalConflict=false` → approve 200 → `canonical`(curated_at 세팅). ✅
2. **두 번째 제출**: 같은 master/STORE/ko 로 공급자 재저장 → upsert 가 canonical#1 은 재사용 제외 → **신규 needs_review 행 #2**(id≠#1) 생성. ✅
3. **충돌 감지(detail)**: #2 `hasCanonicalConflict=true`, `existingCanonicalId=#1`(일치). ✅
4. **승인 차단(API)**: #2 approve → **409 `CANONICAL_CONFLICT`**, `existingCanonicalId=#1`. DB unique violation 아님(명시 차단). ✅
5. **승인 차단(UI)**: 운영자 큐에서 #2 행 상태 셀에 `승인 충돌` 빨강 배지(title 안내) + **승인 버튼 disabled**(title 안내) + 수정 요청 버튼은 활성. ✅
6. **수정 요청 가능(충돌 중)**: #2 request-revision → 200 `revision_requested`(due +30일). 충돌과 무관하게 수정 요청 동작. ✅
7. **회귀**: 공급자 임시저장/검수요청/upsert·운영자 승인(#1)·수정 요청 정상. AUTO-CREDIT/QR/landing/tablet 무접촉. ✅

## 11. 테스트 데이터 정리 결과 (`[SMOKE]`)

| 항목 | id / 값 | 처리 |
|------|---------|------|
| offer | `50ab2cb7-50fc-4a25-8162-0bbb5569b2b3` | **삭제**(bulk delete, deleted:1) |
| master | `1b64db18-fb0f-407f-9142-ee351e7d18fd` | 잔존(orphan `[SMOKE]`, UI 삭제 경로 없음) |
| SPD#1(기존 canonical) | `01b1df74-4d8d-45bf-8e95-cf4790224f09` | **hidden** |
| SPD#2(충돌 대상) | `49ae8136-08fe-4fa5-8aa6-95e6d8a8ac52` | **hidden** |

status 전이: #1 needs_review→canonical→hidden · #2 needs_review→(승인 409 차단)→revision_requested→needs_review→hidden.

## 12. 변경 파일 목록

- `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` — list/detail conflict LEFT JOIN + 인터페이스 필드
- `apps/api-server/src/modules/neture/controllers/operator-supplier-store-description-review.controller.ts` — approve 409 CANONICAL_CONFLICT
- `apps/admin-dashboard/src/api/supplier-store-description-review.api.ts` — 타입 conflict 필드
- `apps/admin-dashboard/src/pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx` — 충돌 배지·승인 비활성·상세 배너·409 처리

## 13. commit SHA

- 구현: `198520542` (feat) — 5 files.
- 배포/smoke 기록: (본 CHECK 갱신 커밋.)

## 14. push 결과

- `198520542` origin/main push 완료. CHECK 갱신 커밋 push(본 커밋).

## 완료 판정

**WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-CONFLICT-POLICY-V1 — CLOSED / PASS**
(구현·정적검증(3앱 0)·배포(API/Admin success)·실브라우저 smoke 통과. 충돌 없음 승인 / 충돌 시 UI 승인 비활성+API 409 CANONICAL_CONFLICT / 충돌 중 수정 요청 가능 확인. 교체·canonical unique index·기존 canonical·AUTO-CREDIT·QR·landing·tablet 무변경. migration 없음.)

## 후속 WO

- `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-V1` — 기존 canonical 교체(기존 처리/새 승격/매장 복사본·QR·landing 영향 분석).
- `WO-O4O-SPD-REVISION-REQUEST-EXPIRY-SCHEDULER-V1` — revision_requested 만료 자동삭제 cron 등록.
