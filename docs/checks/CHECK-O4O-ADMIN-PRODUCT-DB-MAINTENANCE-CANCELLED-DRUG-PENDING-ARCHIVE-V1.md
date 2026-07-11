# CHECK-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-CANCELLED-DRUG-PENDING-ARCHIVE-V1

> WO: `WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-CANCELLED-DRUG-PENDING-ARCHIVE-V1`
> 근거 IR: `IR-O4O-DRUG-PENDING-CANDIDATE-COHORT-AUDIT-V1` (드럭 pending 74,681 중 74,680 = 허가취소 의약품)
> 재사용 기반: `CHECK-...-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1` (동형 job)
> 작성일: 2026-07-11 · 상태: **코드 구현 완료 · apply 미실행 (confirmation 게이트 대기)**

---

## 1. 범위

정비 메뉴 두 번째 job "취소 의약품 pending 후보 정합화" 를 dry-run + apply(confirmation 게이트)로 구현.
apply **코드**만 배포하고 실제 실행은 사용자 명시 승인 후. 승격 아님(승격 대상 0).

## 2. 구현 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/controllers/product-db-maintenance.controller.ts` | cancelled-drug dry-run + apply 라우트 추가(동일 컨트롤러, 기존 mount 재사용) |
| `apps/admin-dashboard/src/api/o4o-product-db.api.ts` | `dryRunCancelledDrugPending` / `applyCancelledDrugPending` |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductDbMaintenancePage.tsx` | 재사용 카드 `MaintenanceArchiveCard` 로 리팩터 + 2번째 카드 추가 |

## 3. 엔드포인트

- `POST /api/v1/admin/o4o-product-db/maintenance/jobs/cancelled-drug-pending-candidates/dry-run` (write 0)
- `POST /api/v1/admin/o4o-product-db/maintenance/jobs/cancelled-drug-pending-candidates/apply`
- 대상 필터: `candidate_status='pending' AND deleted_at IS NULL AND source_label LIKE 'mfds-drug-master-standard-code%' AND (raw_payload->>'isCancelled'='true' OR raw_payload->'source'->>'취소일자' IS NOT NULL)`
- apply 게이트: confirmation `ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES` + expectedCount 경합 가드.
- apply 실행: 청크 update 2,000/txn, UPDATE where 에 대상 필터 전체 재적용, `candidate_status='archived'` +
  `reviewed_at=NOW()` + `review_note='cancelled-drug-archive:WO-...'` 만 set. idempotent. migration 아님.
- 미변경: ProductMaster/ProductIdentifier, hard delete 없음.

## 4. 검증

| 항목 | 결과 |
|---|---|
| api-server typecheck (변경 파일) | ✅ product-db-maintenance 에러 0 |
| admin-dashboard typecheck | ✅ 0 errors |
| dry-run DB write | ✅ 0 |
| apply write 경로 격리 | ✅ apply 엔드포인트에만 UPDATE |
| confirmation/ expectedCount 게이트 | ✅ 코드 차단 |
| 이번 단계 apply 실행 | ❌ 미실행 |
| gate smoke (Apply 미클릭) | (배포 후 §7) |

## 5. 예상 dry-run 수치 (IR 기준)

- targetCount **74,680** / byStatus pending 74,680 / bySourceLabel `mfds-drug-master-standard-code_2025-10-31` 단일.
- 제외: 비취소 1건(체크디짓 불일치, pending 유지).

## 6. typecheck 결과

- api-server: 변경 파일(product-db-maintenance.controller) 에러 0 (기존 무관 20 errors 는 `src/scripts/drug-otc-*`).
- admin-dashboard: **0 errors** (재사용 카드 리팩터 포함).

## 7. gate smoke (배포 후, Apply 미클릭)

배포 후 admin.neture.co.kr `/admin/o4o-product-db/maintenance` 두 번째 카드에서:
Dry-run → targetCount 74,680 확인 → 확인 문구 입력 전 Apply disabled, 정확 문구 입력 후 Apply enabled 확인,
**Apply 클릭 안 함**(apply 요청 0). 결과는 본 문서에 추가.

## 8. 다음 (사용자 명시 승인 필요)

```
취소 의약품 pending 74,680건 archived apply 실행 승인
confirmation: ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES
```
승인 후 apply 실행 → 사후검증(WO §7 A~G) → 본 CHECK 갱신.

---

*Status: 코드 구현 완료 · apply 미실행 · dry-run write 0 · migration 0.*
