# WO-O4O-INTEGRATION-LOCAL-HANDOFF-V1 — 클라우드 통합 세션이 못 하는 일의 LOCAL 인계

> **상태**: ACTIVE
> **작성일**: 2026-11-07 · **최종 갱신**: 2026-11-10 (§5-B 1) · 2) 확인 · 3) 은 분류 대기)
> **실행 위치**: LOCAL
> **인계**: PR #985 로 main 반영 · 다음 실행자 LOCAL(통합 담당) — 결과는 최신 `origin/main` 에서 새 branch(`wo/integration-local-handoff-result` 등)로 기록한다
> **근거**: 통합 담당 지시(2026-11-07 — "클라우드 통합 세션이 못 하는 일은 정리해서 로컬 에이전트에게 넘긴다") · [`IR-O4O-UNMERGED-BRANCH-AND-PR-DISPOSITION-V1`](../investigations/IR-O4O-UNMERGED-BRANCH-AND-PR-DISPOSITION-V1.md) §6 (#984) · PR #968 통합 확인 코멘트

## 1. 배경

클라우드 통합 세션은 아래 일을 할 수 없다.

- **원격 branch 삭제**: `.claude/settings.json` deny 규칙과 `.claude/hooks/guard-git-push.mjs` 가 모든 Claude 세션에서 막는다(`AGENTS.md` §9). 원격 branch 정리는 통합 담당 몫이다(`AGENTS.md` §4-1(i) 7).
- **운영 배포 · migration 반영**: 클라우드 세션은 배포를 실행하지 않는다(`AGENTS.md` §4-1(f) · §9 · `block-cloud-deploy.mjs`). migration 이 포함된 Promote(LEVEL_3)는 운영 DB write · DDL 이라 통합 담당의 명시 승인이 필요하다(`AGENTS.md` §5).
- **운영 DB 조회**: 클라우드 세션에는 gcloud 인증과 Cloud SQL Proxy 가 없다.

2026-11-07 클라우드 통합 세션이 확인한 원격 상태(main `03f1381036` 시점):

| 분류 | 수 | 내용 |
|---|---|---|
| `main` | 1 | |
| 열린 PR 의 branch | 5 | #968 · #975 · #976 · #980 · #981 |
| KEEP | 2 | `wo/pharmacyhub-residual-integration` · `wo/four-service-full-retirement-v1` (IR §7 에서 남은 판단 있음) |
| IR §6 스크립트 대상 | 89 | 삭제 86 + 선택(`OPT`) 3. 스크립트를 아직 실행하지 않아 전부 남아 있다 |

## 2. 사용자 확정

- 통합 담당이 클라우드 통합 세션에 "못 하는 일은 정리해서 로컬 에이전트에게 넘기라"고 지시했다(2026-11-07).
- #984 의 처분 판정(삭제 86 · KEEP 2)은 통합 담당 확인을 거쳐 병합됐다.

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| 스크립트는 IR §6 원문을 그대로 쓴다. 이 WO 에 복제하지 않는다 | 정본 1곳 유지. 삭제 명령에는 검증한 SHA lease 가 걸려 있다(#984 `7e48c6d5` 반영) |
| 스크립트 파일은 저장소 **밖**(예: `$env:TEMP`)에 저장하고, 실행은 저장소 checkout 에서 한다 | 저장소 안에 두면 untracked 파일이 생겨 다른 세션의 stage 범위를 흐린다(`AGENTS.md` §4-2) |
| `-IncludeOptional` 은 통합 담당이 정한다. 권장은 포함 | 선택 3개는 PR 이 없지만 tip 이 이미 main 조상이다(IR §6) |
| #968 반영은 이 WO 에서 실행하지 않고 대기 항목으로만 둔다 | #968 은 아직 CI 실패 · Codex 미해결로 병합 전이다 |

## 4. 범위 밖

- KEEP 2개의 재판정(IR §7 — PH 잔여 데이터 조회 · glycocare scope 정리)은 별도 WO 로 한다.
- 열린 PR 5개의 병합은 클라우드 통합 세션이 한다.

## 5. TODO

### A. 원격 branch 정리 (지금 실행)

- [x] [LOCAL] 기준 checkout 에서 `git fetch origin --prune`, `gh auth status` 로그인 확인.
- [x] [LOCAL] IR §6 의 PowerShell 블록 전체를 `$env:TEMP\cleanup-branches.ps1` 로 저장한다.
- [x] [LOCAL] 미리보기: 저장소 checkout 에서 `& "$env:TEMP\cleanup-branches.ps1"`(선택 포함 시 `-IncludeOptional`).
  - 기대값: `To delete: 86  Skipped: 0`(선택 포함 시 89).
  - `has an open PR` 로 건너뛴 branch 가 있으면 그 PR 이 새로 열린 것이다. 삭제하지 말고 그대로 둔다.
  - `tip changed ... re-check needed` 가 있으면 조사 뒤 새 push 가 있었던 branch 다. 이 WO 의 결과 칸에 이름을 적고 실행에서 빠진 채로 둔다.
- [x] [LOCAL] 미리보기 결과를 확인한 뒤 실행: `& "$env:TEMP\cleanup-branches.ps1" -Execute`(선택 포함 시 `-IncludeOptional` 도 같이).
  - 실행 정책에 막히면 `powershell -ExecutionPolicy Bypass -File "$env:TEMP\cleanup-branches.ps1" -Execute`.
  - `failed` 가 나오면 lease 가 거절한 것이다(그사이 tip 이 바뀜). 재시도하지 말고 이름만 기록한다.
- [x] [LOCAL] 확인: `git ls-remote --heads origin` 의 branch 수를 센다. 기대값은 `main` + 그 시점 열린 PR branch + KEEP 2 + (선택을 빼고 실행했다면) 선택 3.
- [ ] [LOCAL] 임시 파일 `$env:TEMP\cleanup-branches.ps1` 을 지운다. (실행 PC 의 사본 정리는 6절 참고)
- [x] [LOCAL] 아래 6절 결과 칸을 채워 이 WO 를 갱신한다. 최신 `origin/main` 에서 새 worktree · branch 를 만들어 commit · push 하고 PR 을 연다(#985 는 이미 병합된 PR 이라 그 branch 에 쌓지 않는다 — `AGENTS.md` §4-1(e)).

### B. #968 운영 반영 (대기 — #968 병합 후에만)

선행 조건: #968 이 수정돼 클라우드 통합 세션이 병합한 뒤. 그 전에는 실행하지 않는다.

- [x] [LOCAL] **통합 담당 명시 승인 필요** — migration `1794013771244-CreateCommunityNewsAutomation` 이 포함된 Promote(LEVEL_3)는 운영 DB DDL 이다. 승인 뒤 [README — 배포](../../README.md#배포) · [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 절차로 `promote.yml` 을 1회 실행한다(`gh workflow run promote.yml -f sha=<40자 main HEAD>`).
- [x] [LOCAL] Promote run 과 `o4o-api-migrations` Job 이 성공했는지 확인한다.
- [x] [LOCAL] 운영 DB read-only(`o4o_readonly`) 로 아래 SQL 1) · 2) 를 실행한다. 둘 다 시스템 카탈로그만 읽어서 새 테이블 조회 권한이 없어도 된다.
- [ ] [LOCAL] **통합 담당 명시 승인 필요(DB 권한 변경)** — 새 테이블은 `o4o_readonly` 에 기본 거부다([SETUP.md 운영 DB identity](../../SETUP.md) — "새 표는 기본 거부"). 3) 을 실행하기 전에 운영자 로컬의 분류 스크립트를 다시 실행해 두 테이블을 분류한다. 분류 전에는 3) 을 실행하지 않는다.
- [ ] [LOCAL] 분류 뒤 3) 을 실행한다.

```sql
-- 1) 새 테이블 2개가 생겼는가
SELECT to_regclass('public.community_news_articles') IS NOT NULL         AS articles_exists,
       to_regclass('public.community_news_engagement_daily') IS NOT NULL AS engagement_exists;

-- 2) 두 테이블에 계정 삭제 보호 트리거가 걸려 있는가
SELECT c.relname,
       EXISTS (SELECT 1 FROM pg_trigger t
               WHERE t.tgrelid = c.oid
                 AND t.tgname = 'account_erasure_write_fence'
                 AND t.tgenabled = 'O') AS fenced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('community_news_articles', 'community_news_engagement_daily');

-- 3) 첫 자동 실행 기록 수(실행 시각 이후) — 원문 대신 건수만. 분류(조회 권한 부여) 뒤에만 실행한다
SELECT count(*) AS article_rows FROM public.community_news_articles;
```

판정:

| 결과 | 판정 |
|---|---|
| 1) 두 값 모두 `true`, 2) 두 행 모두 `fenced = true` | migration 반영 정상 |
| 1) 이 `false` | migration 미적용 — Promote · migration Job 로그 확인 |
| 2) 에 `false` 가 있음 | 계정 삭제 보호 누락 — 계정 삭제 기능이 이 테이블을 막지 못한다. 즉시 통합 담당에게 보고 |
| 3) 이 `permission denied` 로 실패 | 조회 권한 미확보 — 분류 스크립트가 아직 실행되지 않았다. 장애나 자동 게시 실패가 아니다. 분류 뒤 다시 실행한다 |
| 3) 이 0 이고 08시 · 15시(KST) 실행 시각이 지났음 | 자동 게시 실행 실패 가능 — 운영자 화면 `news-auto-runs` 또는 API 로그 확인(PR #968 위험 항목: `SERVICE_QUERY` quota) |

## 6. 결과 기록 (LOCAL 이 채운다)

- A. 실행 일시 · 실행자: 2026-11-08 · 통합 담당이 로컬 PowerShell 에서 직접 실행. 미리보기와 기록은 LOCAL Claude Code 세션이 했다. 이 세션은 원격 branch 삭제가 막혀 있다.
- A. 미리보기 `To delete / Skipped`: `89 / 0`(선택 포함). 세션 PC 와 실행 PC 에서 각각 돌렸고 결과가 같았다. 새로 열린 PR 과 tip 변경은 없었다.
- A. `-IncludeOptional` 사용 여부: 사용. 선택 3개(`wo/store-daily-workflow-upgrade` · `wo/store-signage-workspace` · `wo/store-video-single-list`)를 포함했다.
- A. 실행 결과 `deleted / failed`, 건너뛴 · 실패한 branch 이름: `Done: deleted 89  failed 0`. 건너뛴 branch 와 실패한 branch 는 없다.
- A. 실행 뒤 원격 branch 수: 11 (2026-11-08 `git ls-remote --heads origin`)
  - `main` 1
  - 열린 PR branch 6: #968 `wo/community-industry-news-v2` · #976 `wo/ci-short-job-consolidation` · #980 `wo/promote-same-sha-guard` · #981 `wo/main-verified-reuse` · #987 `claude/relaxed-newton-7y8pln` · #992 `claude/vibrant-allen-56f5dq`
  - KEEP 2: `wo/pharmacyhub-residual-integration` · `wo/four-service-full-retirement-v1`
  - IR 조사 범위 밖 2. 이번에 손대지 않았고, 통합 담당이 판단한다.
    - `wo/delivery-cancelled-report`: PR 없음. tip `82a07afc63`(2026-11-07 14:42Z)으로 IR 조사 뒤에 push 됐다.
    - `claude/elegant-albattani-5x2elv`: #988 이 병합되지 않고 CLOSED 됐다. 같은 branch 의 #985 는 MERGED 다. tip `fa02b4f0e7`.
  - #975 는 그사이 MERGED 됐다(2026-11-08). head branch 는 자동 삭제됐다.
- A. 임시 스크립트: 세션 PC 에서는 저장소 밖 두 곳(세션 scratchpad · `C:\Users\sohae\cleanup-branches.ps1`)에 사본이 생겼다. 실행 PC 에도 `C:\Users\sohae\cleanup-branches.ps1` 이 있다. 저장소 안에는 파일이 생기지 않았다. 정리 상태는 PR 에 적는다.
- B. Promote: run `Promote 28938d50c1`(#968 merge commit) 2026-11-08 09:05Z · conclusion `success` · job `API / build-and-deploy` success(migration 은 이 job 안에서 실행 — 별도 job 이름 없음. 반영은 아래 1) 로 확인). 이 세션은 실행하지 않았고 GitHub Actions 기록을 조회했다(2026-11-10).
- B. 1) · 2) (2026-11-10 LOCAL · `o4o_readonly` · `default_transaction_read_only = on`): 1) 두 값 모두 `true`. 2) 두 행 모두 `fenced = true` → **migration 반영 정상 · 계정 삭제 보호 트리거 정상.**
- B. 3): `permission denied for table community_news_articles` — 판정표상 **조회 권한 미확보(분류 스크립트 미실행)**. 장애 · 자동 게시 실패 판정 근거가 아니다. 분류(DB 권한 변경)는 통합 담당 명시 승인 사항이라 실행하지 않았다. 남은 것: 승인 → 분류 스크립트 → 3) 재실행.

## 7. 검증 계획

- A 는 실행 뒤 원격 branch 수와 6절 기록으로 확인한다. 클라우드 통합 세션이 다음 확인 때 `git ls-remote` 로 대조한다.
- B 는 위 SQL 판정표로 확인한다.

## 문서 정합

해당 없음
