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
| 이번 단계 apply 실행 | ❌ 미실행 (smoke 에서도 Apply 요청 0) |
| gate smoke (Apply 미클릭) | ✅ **PASS** (§7) |

## 5. 예상 dry-run 수치 (IR 기준)

- targetCount **74,680** / byStatus pending 74,680 / bySourceLabel `mfds-drug-master-standard-code_2025-10-31` 단일.
- 제외: 비취소 1건(체크디짓 불일치, pending 유지).

## 6. typecheck 결과

- api-server: 변경 파일(product-db-maintenance.controller) 에러 0 (기존 무관 20 errors 는 `src/scripts/drug-otc-*`).
- admin-dashboard: **0 errors** (재사용 카드 리팩터 포함).

## 7. gate smoke (배포 후, Apply 미클릭) — PASS

- 배포: commit `71b420e60`(구현) + `52104292f`(fix). Deploy API/Admin success.
- ⚠️ **1차 smoke 500 버그 발견·수정**: TypeORM raw where 에서 엔티티 프로퍼티 `pc.rawPayload` 를 JSON
  연산자 앞에서 컬럼으로 치환하지 못해 `column pc.rawpayload does not exist` 500 발생 → 물리 컬럼명
  `pc.raw_payload` 로 수정(`52104292f`). **smoke 로 잡음.**
- 재smoke 결과(admin.neture.co.kr, 두 번째 카드, **Apply 미클릭**):

| smoke 항목 | 기대 | 결과 |
|---|---|---|
| Dry-run | 200 | ✅ HTTP 200 |
| targetCount | 74,680 | ✅ **74,680** |
| byStatus | pending 74,680 | ✅ |
| bySourceLabel | mfds-drug-master-standard-code_2025-10-31 단일 | ✅ |
| applyEligible / confirmationPhrase | true / ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES | ✅ |
| Apply (입력 전 / 틀린 문구) | disabled | ✅ disabled |
| Apply (정확 문구) | enabled | ✅ **enabled** |
| **Apply 요청 전송** | **0 (미클릭)** | ✅ **applyRequestSent=false** |

→ confirmation 게이트 정상. **apply 미실행 · DB write 0.**

## 8. apply 실행 결과 (2026-07-11 — 사용자 명시 승인 후 실행)

- 승인: `취소 의약품 pending 74,680건 archived apply 실행 승인 / confirmation: ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES`.
- 실행: 데이터 정비 화면 두 번째 카드에서 dry-run(74,680 재확인) → 확인 문구 입력 → Apply.
- apply 직전 독립 재검증(read-only): cancelled pending 74,680 / 드럭 트랙 단일 / 비취소 drug pending 1(대상 제외).

### ⚠️ Cloud Run 요청 타임아웃 → idempotent 재실행으로 완주

- 1차 apply: 청크 update 진행 중 **Cloud Run 요청 타임아웃(~300s)** 으로 HTTP 요청이 30청크(60,000건)에서 종료.
  (JSON 필터 청크 스캔이 청크당 ~10s 라 300s 내 30청크만 처리.) 브라우저 응답 미수신.
- 2차 apply(재실행): 대상이 남은 **14,680건** 으로 dry-run 재확인 → Apply. **idempotent**(archived 된 60,000건은
  대상 필터에서 자동 제외) 라 잔여만 처리. 응답 수신: `updated 14,680 / chunks 8 / 31.8s`.
- 합계 archived = 60,000 + 14,680 = **74,680**. (교훈: 대량 청크 apply 는 Cloud Run 요청 타임아웃에 걸릴 수 있으나
  청크 idempotent 설계로 재실행 완주 가능. 향후 async job 화 검토.)

### 사후검증 SQL (read-only, BEFORE→AFTER)

| 검증 | BEFORE | AFTER | 판정 |
|---|---:|---:|:--:|
| A. 취소 pending 잔량 | 74,680 | **0** | ✅ |
| B. archived 총량 | 69,207 | **143,887** (+74,680) | ✅ |
| C. 드럭 pending 잔량 | 74,681 | **1** | ✅ |
| D. 남은 1건 | — | 바이락스정(아시클로버) / 고려제약(주) / 전문의약품 / 8806428006706 — **비취소·체크디짓 불일치, pending 유지** | ✅ |
| E. ProductMaster (DRUG 177,413 / QUASI_DRUG 17,148 / MEDICAL_DEVICE 3,826) | — | 동일 | ✅ 불변 |
| F. ProductIdentifier active | 621,280 | 621,280 | ✅ 불변 |
| G. 후보 총량 (hard delete 검증) | 394,495 | 394,495 | ✅ 보존 |

→ **apply 성공.** candidate_status(pending→archived) 전환만. ProductMaster/ProductIdentifier 0 변경, hard delete 0.
   드럭 pending 은 이제 1건(별도 수동 확인 대상)만 남음.

> 주: E 의 소수 garbled 분류(의료기기 계열) 미세 변동은 병렬 세션의 product_masters 작업으로, 본 apply(코드상
> product_candidates 만 UPDATE)와 무관. 핵심 DRUG/QUASI/MD master 수는 불변.

## 9. 다음

```text
1. (완료) 취소 의약품 pending 74,680 archived
2. 남은 드럭 pending 1건(비취소·체크디짓 불일치) 수동 확인
```

---

*Status: **apply 실행 완료 · 사후검증 A~G PASS** · candidate_status 전환만 · ProductMaster/Identifier 불변 · hard delete 0 · migration 0.*
