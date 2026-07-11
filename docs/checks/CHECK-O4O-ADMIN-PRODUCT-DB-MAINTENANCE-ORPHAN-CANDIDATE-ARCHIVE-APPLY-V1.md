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
| **이번 단계 apply 실행** | ❌ **미실행** (smoke 에서도 Apply 요청 0) |
| browser smoke (버튼 상태만, apply 클릭 없음) | ✅ **PASS** (§7) |

## 7. browser smoke (버튼 상태 검증 — apply 클릭 없음) — PASS

- 배포: commit `1c5541453` — Deploy API Server / Deploy Admin Dashboard 둘 다 success.
- 환경: admin.neture.co.kr (프로덕션), Playwright chromium headless, admin 계정(SSOT env 주입).
- **Apply 버튼은 클릭하지 않음** — 게이트 상태만 검증. apply 요청 전송 0 확인.

| smoke 항목 | 기대 | 결과 |
|---|---|---|
| Dry-run 실행 | 200 | ✅ HTTP 200 |
| targetCount | 53,428 | ✅ **53,428** |
| applyEligible | true | ✅ true |
| confirmation 입력창 표시 | 표시 | ✅ |
| Apply 버튼 (입력 전) | disabled | ✅ disabled |
| Apply 버튼 (틀린 문구) | disabled | ✅ disabled |
| Apply 버튼 (정확 문구 `ARCHIVE_ORPHAN_REGISTERED_CANDIDATES`) | enabled | ✅ **enabled** |
| **Apply 요청 전송** | **0 (미클릭)** | ✅ **applyRequestSent=false** |

→ confirmation 게이트 정상 동작 확인. **apply 미실행 · DB write 0 유지.**

## 8. apply 실행 결과 (2026-07-11 — 사용자 명시 승인 후 실행)

- 승인: 사용자 명시 `고아 53,428건 archived apply 실행 승인 / confirmation: ARCHIVE_ORPHAN_REGISTERED_CANDIDATES`.
- 실행: admin.neture.co.kr 데이터 정비 화면에서 dry-run(targetCount 53,428 재확인) → 확인 문구 입력 → Apply 클릭.
- apply 직전 독립 재검증(read-only): targetCount 53,428 / approved_new_master 53,209 / matched 219 / nonDrug 0 / 드럭 트랙 단일 — 전부 일치.
- 참고: 장시간 요청이라 브라우저가 HTTP 응답을 수신하기 전 커넥션이 종료됐으나(LB 타임아웃 추정),
  **청크 update 는 idempotent** 라 서버가 완주. 결과는 아래 SQL 사후검증으로 확정.

### 사후검증 SQL (read-only, BEFORE→AFTER)

| 검증 | BEFORE | AFTER | 판정 |
|---|---:|---:|:--:|
| A. 고아 잔량 (registered & master 없음) | 53,428 | **0** | ✅ |
| approved_new_master | 250,817 | 197,608 (−53,209) | ✅ |
| matched | 1,000 | 781 (−219) | ✅ |
| B. archived 총량 | 15,779 | **69,207** (+53,428) | ✅ |
| B. archived 드럭 트랙 (`orphan-archive:` 노트) | 0 | **53,428** | ✅ |
| C. registered WITH master (정상 등록완료) | 198,389 | 198,389 | ✅ 불변 |
| D. ProductMaster (DRUG 177,413 / QUASI 17,148 / MD 3,826 …) | — | 동일 | ✅ 불변 |
| D. ProductIdentifier active | 621,280 | 621,280 | ✅ 불변 |
| 후보 총량 (hard delete 검증) | 394,495 | 394,495 | ✅ 보존 |

→ **apply 성공.** candidate_status 전환만 발생. ProductMaster/ProductIdentifier 0 변경, hard delete 0.
   "등록 완료인데 master 없는 후보"가 이제 등록/검토 흐름에서 완전히 빠짐(고아 잔량 0).

## 9. 다음

```text
1. (완료) 고아 53,428 archived apply
2. 드럭 pending 74,681 코호트 분석 (취소/무효/drug_unspecified/신규)
3. 그 다음에야 드럭 한정 bulk 승격 dry-run 검토
```

---

*Status: **apply 실행 완료 · 사후검증 A~D PASS** · candidate_status 전환만 · ProductMaster/Identifier 불변 · hard delete 0 · migration 0.*
