# CHECK-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1

> WO: `WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1`
> 선행: `CHECK-...-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1` (dry-run + smoke PASS) · IR-...-REGISTER-MISSING-CANDIDATES-AUDIT-V1
> 작성일: 2026-07-11 · 상태: **apply 코드 구현 완료 · apply 미실행 (confirmation 게이트 대기)**

---

## 1. 이번 단계 범위

apply **코드**를 구현하되 **실제 apply 는 실행하지 않는다.** 사람이 확인 문구
`ARCHIVE_ORPHAN_REGISTERED_CANDIDATES` 를 입력해야만 실행되는 구조까지만 만든다.

## 2. 구현 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/controllers/product-db-maintenance.controller.ts` | apply 엔드포인트 추가 + dry-run 응답에 `applyEnabled=applyEligible`, `confirmationPhrase` 추가 |
| `apps/admin-dashboard/src/api/o4o-product-db.api.ts` | `applyOrphanRegisteredCandidates()` + 타입, dry-run 타입에 `confirmationPhrase` |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductDbMaintenancePage.tsx` | disabled Apply 버튼 → `ApplyPanel`(confirmation 입력 게이트) |

## 3. apply 엔드포인트 설계 (구현됨)

`POST /api/v1/admin/o4o-product-db/maintenance/jobs/orphan-registered-candidates/apply`
- guard: `authenticate` + `requireRole(ADMIN_ROLES)`.
- body: `{ confirmation, expectedCount }`.
- **게이트(불충족 시 write 없이 차단):**
  1. `confirmation !== 'ARCHIVE_ORPHAN_REGISTERED_CANDIDATES'` → 400 `CONFIRMATION_REQUIRED`
  2. `nonDrugCount > 0` (드럭 외 대상) → 409 `NON_DRUG_TARGET`
  3. `expectedCount !== currentCount` (경합) → 409 `COUNT_MISMATCH`
  4. `currentCount === 0` → write 없이 no-op 응답
- **실행:** migration 아님. 청크 update(2,000/txn). 각 청크 UPDATE where 에 대상 필터 재적용
  (`id IN (...) AND candidate_status IN (registered) AND matched_product_master_id IS NULL AND deleted_at IS NULL`).
  `candidate_status='archived'` + `reviewed_at=NOW()` + `review_note='orphan-archive:WO-...'` 만 set.
  archived 로 바뀐 행은 대상 필터에서 자동 제외 → **idempotent**(재실행 시 남은 대상만). maxChunks/affected=0 backstop 으로 무한루프 방지.
- **미변경 보장:** ProductMaster/ProductIdentifier 미터치. ProductCandidate hard delete 없음(상태 전환만).

## 4. DB write 경계

| 경로 | DB write |
|---|---|
| dry-run 엔드포인트 | **0** (SELECT/COUNT/GROUP BY) |
| apply 엔드포인트 | candidate_status UPDATE **만** (confirmation 통과 시). ProductMaster/Identifier 0 |
| 이번 단계 실제 실행 | **없음** (apply 미호출) |

## 5. 프론트 게이트

- `ApplyPanel`: confirmation 텍스트 입력 + Apply 버튼.
- Apply 버튼 활성 조건: `result.applyEligible && confirmText === CONFIRMATION_PHRASE && !applying`.
- 확인 문구 불일치 시 버튼 disabled. 성공/실패 `react-hot-toast` + 인라인.
- apply 성공 시 dry-run 재실행(`onApplied`)으로 targetCount 감소(→ 0) 확인.

## 6. 검증

| 항목 | 결과 |
|---|---|
| api-server typecheck (변경 파일) | ✅ product-db-maintenance 에러 0 (기존 무관 20 errors 는 `src/scripts/drug-otc-*`) |
| admin-dashboard typecheck | ✅ 0 errors |
| dry-run DB write | ✅ 0 유지 |
| apply write 경로 격리 | ✅ apply 엔드포인트에만 UPDATE 존재 |
| confirmation 없이 apply | ✅ 400 차단 (코드) |
| confirmation 오입력 | ✅ 400 차단 (코드) |
| expectedCount 불일치 | ✅ 409 차단 (코드) |
| 드럭 외 대상 | ✅ 409 차단 (코드) |
| **이번 단계 apply 실행** | ❌ **미실행** |
| browser smoke (버튼 상태만, apply 클릭 없음) | 배포 후 확인 (§7) |

## 7. browser smoke (버튼 상태 검증 — apply 클릭 없음)

배포 후, admin.neture.co.kr `/admin/o4o-product-db/maintenance` 에서:
1. Dry-run 실행 → targetCount 53,428 재확인
2. confirmation 입력 전 Apply 버튼 **disabled** 확인
3. `ARCHIVE_ORPHAN_REGISTERED_CANDIDATES` 입력 후 Apply 버튼 **enabled** 확인
4. **Apply 클릭하지 않음** (실행 금지) → DB write 0 유지

> 결과는 확인 후 본 문서에 추가.

## 8. 다음 (사용자 명시 승인 필요)

apply 실제 실행은 사용자가 아래를 명시적으로 승인해야 한다:
```
고아 53,428건 archived apply 실행 승인
confirmation: ARCHIVE_ORPHAN_REGISTERED_CANDIDATES
```
승인 전까지 apply 를 실행하지 않는다. 실행 후 사후검증(WO §6 SQL A~D) + 본 CHECK 갱신.

---

*Status: apply 코드 구현 완료 · apply 미실행 · dry-run write 0 · migration 0 · typecheck PASS.*
