# WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1

> **성격**: 구현 WO — [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) 이 정한 보유기간을 **현재 무기한으로 쌓이는 저장소에 실제로 적용**한다. 정책을 새로 정하지 않는다(기간은 정본 그대로).
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **상태**: DRAFT (2026-09-17)
> **선행**: 보유기간 정책 확정 (완료 · 2026-09-17) · [`IR-O4O-PRIVACY-POLICY-RUNTIME-DATA-FLOW-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-POLICY-RUNTIME-DATA-FLOW-CENSUS-V1.md) §7 · §8 · §9
> **후속**: 이 WO 완료 상태를 기준으로 `O4O 개인정보 처리방침 v1.0` 최종본 작성 → 4 활성 서비스 `/privacy` 게시(`service_policy_documents`)
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)(auth-core 는 읽기만) · [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) · CLAUDE.md §8(진단·정리 경로는 CLI/job 우선, HTTP route 금지)

---

## 1. 목표와 배경

Census IR 이 확인한 현황: `login_attempts`(30일 job) 와 `o4o-video-temp-output`(3일 lifecycle) 외에는 **개인정보를 포함하는 로그·문의 테이블에 삭제 정책이 전혀 없다.** `contact_inquiries` · `email_logs` · `audit_logs` · `action_logs`(9,390 row · 90일 초과 4,153) · `kpa_operator_audit_logs` · `ai_usage_logs` 가 무기한 누적 중이고, `neture-db-final-export` 버킷(DB 사본)과 `o4o-media-library` 의 탈퇴/삭제 연동은 미검증이다.

처리방침 v1.0 에 "1년" 을 적으려면 시스템이 실제로 1년 뒤 지워야 한다. 이 WO 는 **정책 문서와 시스템 동작을 일치**시키는 작업이다.

## 2. 승인 범위

| # | 대상 | 정책 기간 | 구현 |
|---|---|---:|---|
| A | `contact_inquiries` | 처리 완료(`handled_at`) 후 1년 | 정기 삭제 job (미처리 row 는 삭제 대상 아님) |
| B | `email_logs` | `sentAt`(없으면 `createdAt`) 후 1년 | 정기 삭제 job |
| C | `audit_logs` | 생성 후 1년 | 정기 삭제 job |
| D | `action_logs` | 생성 후 1년 | 정기 삭제 job |
| E | `kpa_operator_audit_logs` | 생성 후 1년 | 정기 삭제 job |
| F | `ai_usage_logs` | 생성 후 1년 | 정기 삭제 job |
| G | `o4o-media-library` | 탈퇴·콘텐츠 삭제 시 즉시 | **검증만**: 회원 탈퇴 · 콘텐츠 삭제 흐름이 GCS 객체를 실제 삭제하는지 코드·실측 확인. 미연결이면 보고 후 별도 WO (이 WO 에서 삭제 배선을 새로 만들지 않는다) |
| H | 수동 DB export | 최대 30일 | 신규 export 용 lifecycle 규칙 정의(문서·gcloud 명령). `neture-db-final-export` 는 **처분 판단만 보고** (삭제는 사용자 명시 승인 후 별도) |

구현 방식(A~F 공통):

- 기존 패턴 재사용: `apps/api-server/src/jobs/cleanupLoginAttempts.ts`(setInterval 24h · `server.ts:165` 에서 start) 와 동일한 형태의 **단일 retention job** 하나로 6 테이블을 처리한다(테이블별 job 6개 만들지 않는다). 파일명 예: `jobs/privacyRetentionCleanup.ts`.
- 기간은 정책 정본의 값을 **코드 상수 기본값**으로 두고 env 로 단축/연장할 수 있게 하되(`PRIVACY_RETENTION_DAYS_*`), env 로 무기한(0/음수) 설정은 거부한다.
- 삭제는 **배치(LIMIT) 반복**으로 수행해 장시간 lock 을 피한다. 삭제 건수만 logger 에 남기고 row 내용은 남기지 않는다.
- 첫 실행이 `action_logs` 수천 row 를 지우게 되므로 **dry-run 모드**(`--dry-run` 또는 env)로 삭제 예정 건수를 먼저 보고한다.
- Raw SQL 은 parameter binding (CLAUDE.md §7 Guard 2). 삭제 조건에 serviceKey 필터는 두지 않는다(플랫폼 전역 정책).

## 3. 실행 순서

1. 시작 Git 상태 확인(`git fetch` · `status -sb` · 대상 파일 dirty 여부).
2. 6 테이블의 시간 컬럼·인덱스 확인(`created_at` 인덱스 유무 — 없으면 **보고만**, 인덱스 추가는 migration 이므로 중지 조건).
3. retention job 구현 + `server.ts` 등록 + 단위 테스트(테이블별 cutoff 계산 · dry-run · 무기한 env 거부).
4. 로컬/격리 DB 에서 dry-run → 실삭제 → 잔존 row 0 확인.
5. G 검증: 탈퇴/삭제 코드 경로 추적 + 프로덕션 read-only 로 최근 삭제된 콘텐츠의 GCS 객체 잔존 여부 표본 확인.
6. H: export lifecycle 규칙 문서화 · `neture-db-final-export` 내용물 목록(파일명·크기·생성일만) 보고.
7. typecheck · build · 테스트 → path-specific commit → push → 배포 후 프로덕션에서 **dry-run 로그로 삭제 예정 건수 확인** → 실삭제는 사용자 승인 후 활성화(§5).
8. CHECK 작성 → 정책 정본 §15 "현행 집행" 열 갱신 → 완료 보고.

## 4. 제외 범위

- 보유기간 값 변경 · 새 보유기간 항목 추가 (정책 정본의 권한)
- `login_attempts`(이미 구현) · `o4o-video-temp-output`(이미 lifecycle) · Cloud Logging · Cloud SQL 백업 설정 변경
- 회원 탈퇴 로직 자체의 변경(auth-core 동결) · 탈퇴 ↔ GCS 삭제 배선 신설(G 는 검증만)
- `ai_query_logs` 처분(미사용 dead 구조 — 별도 정리 트랙)
- 전자상거래 기록 보존(거래 미개시)
- 개인정보 처리방침 본문 작성 (후속 작업)

## 5. 중지 조건

- 인덱스 추가 · 컬럼 추가 등 **migration 이 필요**해지는 경우
- 프로덕션 **실삭제 활성화** — dry-run 건수 보고 후 사용자 명시 승인 전에는 실행하지 않는다
- `neture-db-final-export` 등 **버킷·객체 삭제** — 사용자 명시 승인 필요
- `auth-core` · `users` 처리 흐름 변경이 필요해지는 경우
- 삭제 대상 테이블을 다른 기능이 "무기한 이력" 으로 의존하고 있음이 발견되는 경우(예: `action_logs` 를 조회하는 화면이 1년 이전 데이터를 전제) → 보고 후 판단

## 6. 검증과 Git

- 단위 테스트: cutoff 계산 6종 · dry-run 은 DELETE 를 실행하지 않음 · 무기한 env 거부 · 배치 반복 종료 조건
- 격리 DB: 경계값(365일 ±1일) row 로 삭제/보존 확인
- 프로덕션: 배포 후 dry-run 로그의 테이블별 삭제 예정 건수를 IR 실측(예: `action_logs` 90일 초과 4,153)과 비교해 그럴듯한지 확인
- Git: `git add .`/`-A` 금지 · `node scripts/git/check-staged-scope.mjs <paths>` → `git commit -m "..." -- <paths>` · 다른 세션 dirty 파일 불가침 · HEAD == origin/main
- 로그·보고에 row 내용(이메일·이름·문의 본문) 출력 금지 — 건수만

## 7. 완료 보고

1. 시작 Git 상태 2. 구현 파일 목록 3. 테이블별 cutoff 규칙 4. 단위/격리 테스트 결과 5. 프로덕션 dry-run 건수(테이블별) 6. 실삭제 활성화 여부(승인 전이면 "대기") 7. G 검증 결과(탈퇴·삭제 ↔ GCS 연결 여부) 8. H 결과(export 규칙 · 기존 버킷 처분 판단) 9. 인덱스 부재 등 migration 필요 항목 10. commit SHA · push · 최종 Git 상태 11. 정책 정본 §15 갱신 내용 12. `문서 정합: …` 한 줄
