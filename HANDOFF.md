# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/elegant-albattani-5x2elv` · 코드 기준: `main` `03f1381036` · 작성: 2026-11-07 14:34Z (클라우드 통합 세션)
> 다음 실행자: **LOCAL(통합 담당)** — [`WO-O4O-INTEGRATION-LOCAL-HANDOFF-V1`](docs/work-orders/WO-O4O-INTEGRATION-LOCAL-HANDOFF-V1.md)
> 이전 인계 전문: `git show 03f1381036:HANDOFF.md`

## 운영 원칙 (통합 담당 지시 2026-11-07)

클라우드 통합 세션이 못 하는 일(원격 branch 삭제 · 운영 배포 · migration Promote · 운영 DB 조회)은 **정리해서 LOCAL 에 넘긴다.** 형식은 `docs/work-orders/` 의 WO(실행 순서 · read-only SQL · 판정 기준 포함) + 이 파일의 "다음 실행자" 칸이다. 이번 인계가 첫 사례다.

## 완료된 것 (2026-11-07 클라우드 통합 세션)

- 병합: #972 · #974(#972 에서 빠진 IR §8) · #978 · #977 · #979 · #983 · #982 · #973(문서 · 에이전트 설정 빠른 경로) · #984(branch 처분 조사 — 삭제 스크립트에 SHA lease 를 이 세션이 보완 `7e48c6d5`).
- post-merge CI: #972 · #974 · #977 · #978 · #979 success. #982 의 main run 은 직후 #973 push 에 밀려 cancelled(실패 아님). #983 · #973 · #984 는 마지막 확인 때 진행 중이었다.

## 진행 중 · 대기 (2026-11-07 14:33Z 조회)

| PR | branch(원격) | 상태 | 다음 |
|---|---|---|---|
| #968 커뮤니티 뉴스 자동 게시 | `wo/community-industry-news-v2` 있음 | OPEN · **보류** — HEAD `0db752c` | 작업 세션 수정 필요: 새 테이블 2개의 `account_erasure_write_fence` 트리거 누락(CI 실패), Codex P1(표준 리스트) · P2(URL 정규화), Sonar. base 가 오래돼 `git merge origin/main` 필요. [통합 코멘트](https://github.com/Renagang21/o4o-platform/pull/968#issuecomment-6707486063) |
| #975 드래프트 경량 검사 | `wo/draft-light-ready-guarantee` 있음 | OPEN · Ready | CI PR 순서 다음 차례. 클라우드 통합 세션 지정 필요 |
| #976 · #980 · #981 | 각 branch 있음 | OPEN · 드래프트 | #975 → #976 → #980 → #981 순서. 앞 PR 병합 후 작업 세션이 최신 main 에 맞추고 Ready |

## 다음에 할 일 (우선순위 순)

1. **[LOCAL]** WO §5-C — #986(admin 운영자 메뉴 정리 · 화면 코드 24 파일) 실제 계정 화면 확인. 통과하면 병합 → Delivery 자동 배포 → 운영 확인. 삭제 · 해지 버튼은 누르지 않는다.
1. **[LOCAL]** WO §5-A — #984 §6 스크립트로 원격 branch 86개(+선택 3) 정리. 미리보기 → `-Execute` → 결과를 WO §6 에 기록 · push.
2. **[CLOUD]** #975 부터 CI PR 순차 통합(통합 세션 지정 필요).
3. **[CLOUD]** #968 수정(작업 세션) → 클라우드 통합 세션이 CI · 리뷰 확인 후 병합.
4. **[LOCAL]** WO §5-B — #968 병합 후에만: 통합 담당 승인 → `promote.yml`(LEVEL_3) → read-only SQL 로 테이블 · 트리거 · 첫 실행 확인.
5. KEEP 2 branch 재판정(IR §7) — 별도 WO.

## 주의 · 결정

- 클라우드 세션은 원격 branch 삭제 명령을 실행할 수 없다(settings deny + `guard-git-push` 훅). 로컬 시험용 bare 저장소에서도 같은 문자열이 막힌다 — #984 lease 삭제는 실행 시험을 하지 못했다. 미리보기부터 확인한다.
- 스크립트 파일은 저장소 밖(`$env:TEMP`)에 저장한다(untracked 파일 방지).
- 다른 PC 의 worktree 는 이 PC 에서 정리하지 않는다. main 반영은 PR merge 하나뿐이다. 저장소 Public — 실명 · 자격증명 기록 금지.

## PR #339 작업공간 — 소유 세션 확인 후 정리 (유지)

PR #339 의 main 통합 · 운영 배포는 완료됐지만 작업 PC 와 소유 세션이 확인되지 않았다. 원래 소유 세션이 [AGENTS.md §4-1(i)](AGENTS.md#4-1-parallel-session--worktree-policy) 조건을 확인한 경우에만 자기 worktree · branch 를 정리한다. 불명확하면 보존한다. 2026-11-06 조회: PR #339 MERGED · 원격 branch 없음 · 포맷한 PC 에는 해당 worktree 없음. 실제 정리 확인 전까지 이 안내를 유지한다.

## 집 PC 환경 (2026-11-07, 유지)

- 완료: git · gh · Node 22.23.4 · pnpm 10.25.0 · gcloud(ADC) · Cloud SQL Proxy v2.14.3 · `psql`(PostgreSQL 15.19, 서버 서비스는 수동 시작). worktree 위치 `o4o-wt`.
- 운영 DB read-only 접속 확인됨: 프록시 경유 `o4o_readonly` · `default_transaction_read_only = on`. 비밀번호는 `gcloud secrets versions access latest --secret=o4o-db-readonly-password` 로 `PGPASSWORD` 에 넣고 조회 후 지운다.
- 미완료: `docs/local/TEST-ACCOUNTS.local.md`(사용자 원본 필요). 로컬 PG `listen_addresses` 는 로컬 DB 로 쓸 때 `localhost` 로 좁힌다.
- 세부: [`WO-O4O-HOME-PC-DEV-ENV-REBUILD-V1`](docs/work-orders/WO-O4O-HOME-PC-DEV-ENV-REBUILD-V1.md) 5-6. D 드라이브는 작업에 쓰지 않는다.
