# CHECK-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1

> **대상 WO**: [`WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1`](../work-orders/WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1.md) · **정책 정본**: [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)
> **판정**: **PASS — CLOSED (2026-09-17)**. 정책 ↔ 구현 ↔ production 정합.
> **성격**: Phase 1 = 구현 + 검증 + production dry-run(DELETE 0) · Phase 2 = 사용자 승인 후 apply 활성 + export 정리 + 정본 정렬. schema 변경 0 · migration 0 · 개인정보 실삭제 0건(대상 없음).
> **비노출 원칙**: 이 문서에는 건수·기준일·object 이름만 적는다. row 내용(이메일·IP·문의 본문·AI 오류 내용)·DB 접속값은 기록하지 않는다.

---

## 1. Phase 1 — 구현 (commit `40b5939e9`)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/services/privacy-retention.service.ts` | 신규. `RETENTION_TARGETS` 6 테이블(정본 §15 → `policyDays` 365) · anchor 독립 정의 · `dryRun()/apply()` · `DELETE … WHERE id IN (SELECT id … LIMIT 500)` 배치 · env `PRIVACY_RETENTION_DAYS_<KEY>` 는 정수이면서 정본 이상일 때만 채택(단축 불가) |
| `apps/api-server/src/jobs/privacy-retention.job.ts` | 신규. 기존 job 표준(in-app setInterval · 부팅 1회 + 24h) · `PRIVACY_RETENTION_MODE` 가 정확히 `apply` 일 때만 DELETE, 그 외 전부 dry-run · `PRIVACY_RETENTION_ENABLED='false'` kill-switch · 로그는 건수·기준일만 |
| `apps/api-server/src/services/startup.service.ts` | +7줄 — start/stop 등록 |
| `apps/api-server/src/__tests__/privacy-retention.spec.ts` | 신규. 단위 6 + 격리 PG 통합 4 |
| `jobs/cleanupLoginAttempts.ts` · `server.ts` | **무변경** — login_attempts 30일은 기존 계약 그대로 |

### 1-1. 테이블별 anchor rule · 보유기간 (정본 §15 그대로 · 변경 없음)

| 테이블 | 보유 | anchor | 삭제 조건 · 예외 |
|---|---:|---|---|
| `contact_inquiries` | 처리 완료 후 1년 | `handled_at` | `status IN ('answered','closed','spam') AND handled_at IS NOT NULL`. `received/in_review` = open(보고만). 종결 status + `handled_at NULL` = `UNRESOLVED_RETENTION_ANCHOR`(삭제 안 함 · 건수 보고). `created_at` 미사용 |
| `email_logs` | 발송일 1년 | `COALESCE("sentAt","createdAt")` | — |
| `audit_logs` | 1년 | `"createdAt"` | 접속기록 · 1년 미만 단축 불가(코드 강제) |
| `action_logs` | 1년 | `created_at` | 동일 |
| `kpa_operator_audit_logs` | 1년 | `created_at` | 동일 |
| `ai_usage_logs` | 1년 | `"createdAt"` | 메타데이터만 |

2년 상향(민감정보 시스템)은 정본 개정 + `policyDays` 변경으로 처리. 현재 임의 2년 미적용.

### 1-2. Phase 1 검증

- 단위 6/6 · 격리 PG17 통합 4/4 (contact 8건 → eligible 3 / unresolved 2 / open 2 · email COALESCE ±1일 · 4 감사 테이블 batch 2 로 20건 · env 730 연장 / '364','90','0','-1','abc','1.5' 는 365 fallback)
- `tsc --noEmit` 0 · `npm run build` 0 · 인접 `automation-video-temp-output` 5/5 · deploy-api run `35184982687` success
- **Production dry-run (read-only · 2026-09-17T05:12Z · 세션 TZ UTC · cutoff 2025-09-17)**: 6 테이블 전부 eligible 0 · unresolved 0 (contact_inquiries 3 / email_logs 90 / audit_logs 8 / action_logs 9,409 / kpa_operator_audit_logs 267 / ai_usage_logs 25). 가장 오래된 row = 2026-04-03 → 최초 실삭제 대상은 **2027-04 이후**. 부팅 dry-run 로그(05:22Z) 동일 · DELETE 0.
- Migration: **불필요** (모든 anchor 가 기존 timestamp 컬럼 · 신규 column/index 0).

### 1-3. GCS 검증 (조사만 · 객체 삭제 0)

- 콘텐츠 삭제 ↔ GCS: MediaLibrary `deleteAssetIn` = GCS 삭제 → row 제거 트랜잭션(실패 시 row 보존). Neture/Store 상품 이미지 `deleteImage` 는 대부분 fire-and-forget(실패 시 orphan 가능 · 재시도 없음).
- 탈퇴 ↔ GCS: **미연결**. 자체 탈퇴 route 없음 · admin `deleteUser` 의 `softDelete` 는 `users` 에 `deleted_at` 없어 dead path · media_assets/GCS cascade 없음.
- orphan 실측: DB 경로 2,862 vs `o4o-media-library` 객체 2,864 (≈2). 처분은 별도 WO(개인정보·Identity 재정렬 트랙). **이번 WO 에서 배선·정리하지 않음.**

## 2. Phase 2 — 사용자 승인 (2026-09-17)

| 항목 | 승인 |
|---|---|
| A. `PRIVACY_RETENTION_MODE=apply` 활성 | 승인 (현재 대상 0건 · 정책과 운영 일치 목적) |
| B. `neture-db-final-export` 2026-08-18 빈 export 2건 삭제 | 승인 (정확한 object 2개만) |
| C. `o4o-platform-db-full-20260904-1420.sql.gz` | **보존** · 2026-10-04 이후 재판단 |

## 3. Phase 2 — 실행 결과

### 3-1. canonical deploy workflow (commit `5c0b7114e`)

- `.github/workflows/deploy-api.yml` `gcloud run deploy` 단계에 `--set-env-vars="PRIVACY_RETENTION_MODE=apply"` 1줄 + 주석 5줄. YAML 유효.
- Cloud Run 콘솔 수동 변경 없음(workflow 가 매 배포 env 전체를 교체하므로 workflow 가 유일 출처). 신규 secret/variable 0. `PRIVACY_RETENTION_ENABLED` 는 코드 기본 계약(`'false'` 일 때만 skip)이 명확하므로 추가하지 않음 — kill-switch 동작 유지.

### 3-2. 배포 · runtime

- deploy-api run `35186044905` **success** · revision `o4o-core-api-03689-wg4` traffic 100%.
- `gcloud run services describe` env: `PRIVACY_RETENTION_MODE=apply` 확인.

### 3-3. Production 최초 apply 실행 (Cloud Logging · 2026-09-17T05:37:43Z)

`[privacy-retention] starting scheduled job (every 24h, mode=apply)` → `[privacy-retention] apply done` (67ms)

| table | total_rows | retention_days | cutoff | eligible | deleted | unresolved |
|---|---:|---:|---|---:|---:|---:|
| contact_inquiries | 3 | 365 | 2025-09-17T05:37:43Z | 0 | 0 | 0 |
| email_logs | 90 | 365 | 〃 | 0 | 0 | 0 |
| audit_logs | 8 | 365 | 〃 | 0 | 0 | 0 |
| action_logs | 9,442 | 365 | 〃 | 0 | 0 | 0 |
| kpa_operator_audit_logs | 267 | 365 | 〃 | 0 | 0 | 0 |
| ai_usage_logs | 25 | 365 | 〃 | 0 | 0 | 0 |

**total_eligible 0 · total_deleted 0 · total_unresolved 0** — 기대값과 일치(예상 외 eligible 없음 · 중지 조건 미발동). **개인정보 실제 삭제 건수 = 0.**

### 3-4. `neture-db-final-export` 정리

삭제 전 재확인 → 정확한 object 경로 2개만 `gcloud storage rm` (wildcard 없음) → 재조회.

| object | 생성일 | 크기 | 처분 |
|---|---|---:|---|
| `neture-db_neture_20260818.sql.gz` | 2026-08-18 | 451 B | **삭제** |
| `neture-db_postgres_20260818.sql.gz` | 2026-08-18 | 449 B | **삭제** |
| `o4o-platform-db-full-20260904-1420.sql.gz` | 2026-09-04 | 317.33 MiB | **보존** (2026-10-04 이후 재판단) |

삭제 후: 버킷 object 1개(9/04 full 만). `8/18 empty export = 0` · `9/04 full export = exists`. 다른 backup·`o4o-media-library` 객체 삭제 0.

### 3-5. 정본 정렬

`O4O-PRIVACY-DATA-RETENTION-POLICY-V1` — 헤더에 현행 집행 상태 1줄 · §3 · §4 · §6 · §8 · §9 · §12 "현행" 줄 · §15 "현행 집행" 열을 `정책 확정 + retention job 구현 + production apply 활성` 상태로 정렬. **보유기간 열 무변경**(diff 로 대조).

### 3-6. Phase 2 검증

- workflow YAML parse OK · `tsc --noEmit` 0 · `privacy-retention.spec.ts` 단위 6/6(격리 PG 4건은 이번 세션 PG 미기동으로 skip — 코드는 Phase 1 이후 무변경, 당시 4/4)
- deploy success · Cloud Run env apply · production apply 로그 · export 버킷 재조회 — 위 3-2 ~ 3-4.

## 4. 완료 조건 대조

```text
PRIVACY_RETENTION_MODE = apply          ✔ (Cloud Run env)
canonical deploy workflow = apply       ✔ (5c0b7114e)
production job = apply                  ✔ (로그 mode=apply)
unexpected eligible = 0                 ✔
unexpected delete = 0                   ✔ (total_deleted 0)
8/18 empty exports = deleted            ✔ (2건)
9/04 full export = retained             ✔
retention policy ↔ implementation ↔ production = aligned  ✔
```

## 5. 하지 않은 것 (WO §7)

retention 기간 변경 · schema/migration · GCS media object 삭제 · 회원 탈퇴 구조 수정 · media orphan 정리 · 9/04 full export 삭제 · 다른 backup 삭제 · 개인정보 처리방침 본문 작성 — 모두 미수행.

## 6. 후속 (이 WO 밖)

- 개인정보 처리방침 v1.0 최종본 → 4 활성 서비스 `/privacy` 게시 (다음 순서 · 개발 작업 선행 없음)
- 탈퇴 ↔ GCS 연동 · media orphan: 개인정보·Identity 재정렬 트랙의 별도 WO
- `neture-db-final-export` 9/04 full export: 2026-10-04 이후 재정당화 판단
