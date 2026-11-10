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
| ~~#968 커뮤니티 뉴스 자동 게시~~ | — | **MERGED(2026-11-08 08:47Z · `28938d50c1`)** · Promote 같은 날 09:05Z success | 남은 것: 아래 3 · 4 |
| ~~#975 · #976 · #980 · #981~~ | 원격 branch 삭제됨 | **MERGED(2026-11-08)** | 후속은 아래 「다음에 할 일」 8~14 |
| ~~#986 admin.neture.co.kr 운영자 메뉴 정리~~ | — | **MERGED(2026-11-08 00:42Z · `ff85ddfcee`)** | 남은 것: **사용자가 실제 화면 확인**(아래 6 · 「#986 배포 후 화면 확인」) |

## 다음에 할 일 (우선순위 순)

1. ~~**[LOCAL]** WO §5-A — 원격 branch 정리~~ **완료(2026-11-08)** — 선택 포함 89개 삭제 · 실패 0. 결과는 WO §6.
2. ~~**[CLOUD]** #975 부터 CI PR 순차 통합~~ **완료(2026-11-08)** — #975 → #976 → #980 → #981 순서로 병합. 함께 병합: #995(Delivery 취소 run 기록) · #1000(#976 에서 분리한 기준 문서).
3. ~~**[CLOUD]** #968 수정 → 병합~~ **완료(2026-11-08)**.
4. **[통합 담당 승인 → LOCAL]** WO §5-B — Promote · SQL 1) · 2) · 3) **완료(2026-11-10)** — 테이블 존재 · fence 정상 · 뉴스 테이블 분류(통합 담당 승인, 전체 조회 320 · 검증 PASS) · 기사 291건. 결과는 WO §6.
5. KEEP 2 branch 재판정(IR §7) — 별도 WO.
6. **[통합 담당 → 사용자]** #986 병합 · 배포 후 아래 「#986 배포 후 화면 확인」을 사용자가 운영 화면에서 확인한다. 문제가 나오면 새 branch 로 수정 PR 을 연다(병합된 #986 branch 는 재사용하지 않는다).
7. **[LOCAL · 2026-11-13 이후]** 계정 이용약관 · 개인정보 처리방침 · 서비스별 안내 v2 게시(공고 2026-10-12 → 시행 2026-11-13) — [`WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1`](docs/work-orders/WO-O4O-ACCOUNT-POLICY-V2-PUBLICATION-V1.md). §5-1 read-only 조회 · §5-2 본문 준비는 13일 전에 해도 된다. 게시(§5-3)는 통합 담당 승인 후. (2026-11-08 클라우드 세션 · branch `claude/intelligent-cray-o2p4u3`)

**GitHub CI · 배포 정비 후속 (2026-11-09 · 클라우드 세션 `claude/nifty-sagan-csagf1` 종료 인계)** — 근거: [`IR-O4O-PRIVATE-CI-BUDGET-V1`](docs/investigations/IR-O4O-PRIVATE-CI-BUDGET-V1.md) · [`CHECK-O4O-DELIVERY-CANCELLED-RUN-REPORT-V1`](docs/checks/CHECK-O4O-DELIVERY-CANCELLED-RUN-REPORT-V1.md) · 각 PR 설명

8. **[사용자 · 통합 담당]** 저장소 변수 확인 — 클라우드 세션은 Actions 변수를 조회할 수 없다(proxy 403).
   - `CI_COST_PROFILE=budget`(드래프트 PR 경량 검사, #975): 설정 여부 확인. 시험 절차는 #975 PR 설명.
   - `CI_MAIN_REUSE=true`(main 검증 재사용, #981): 켤지 결정. 켜기 전에는 매일 04:37 KST main 전체 검사만 추가된다. 켠 뒤 첫 main 병합에서 Detect 의 판정 요약(verified · 근거 run) · 무거운 job skip · `CI Gate` success · Delivery 동작을 확인한다.
9. **[LOCAL · 통합 담당]** #980(Promote 같은 SHA guard) 병합 후 **첫 실제 Promote** 에서 확인 — **① 확인(2026-11-10)**: 첫 Promote `6120c5fb9d`(2026-11-09 08:10Z, api · admin)의 guard 로그 `skip=false — 같은 SHA 의 이전 Promote 없음` · 마지막 commit status `production` success DEPLOYED. ②~④ 는 Promote 를 다시 실행해야 확인되므로 다음 실제 Promote 때 본다. ① `Same-SHA guard` 로그 ② 같은 SHA 를 다시 실행하면 건너뛰는지(앞 run 이 모든 서비스를 target 에 올린 경우만) ③ `force='true'` 면 실행되는지 ④ `services` 입력 시 run 이름에 `services=` 가 남는지. 완료 판정은 그 run 이 남긴 마지막 commit status `production`(DEPLOYED · NO_DEPLOY success)이다.
10. **[CLOUD · 사용자 결정 필요]** PC installer Windows 시험 일시 실패 안정화 PR 여부 — `tools/o4o-local-agent/test/release-install.test.mjs`. 2026-11-08 관측: `FIXTURE_WORKER_NOT_UNIQUE`(122행 · #987 · #995, 2회), `installed runtime must serve health`(#980 `988ef329a8`, 1회). 모두 재실행에서 통과. 추정 원인(로그 미확인): worker 프로세스 수를 한 번만 센다 → 정확히 1개가 될 때까지 짧게 재조회하는 시험 코드 수정안. 제품 코드 변경 없음.
11. **[CLOUD · 사용자 결정 필요]** 배포 workflow 정비 후보 ① — Delivery 가 부르는 reusable deploy 호출마다 `detect-changes` · `CI gate` · `summary` 가 별도 job 으로 돈다(2026-10-24~11-07 Web 호출 131회 · API 34 · Admin 26). classify 가 이미 같은 확인을 하므로 두 판정 job 을 합치는 안. deploy workflow 구조 변경이라 착수 전 승인 필요(판정 · 게이트 job 변경은 `deploy-workflow-diff` 상 control = 배포 무영향).
12. **[CLOUD]** 배포 workflow 정비 후보 ② — `deploy-web-services.yml` 상단 `on:` 주석과 `scripts/ci/deploy-orchestrate.mjs` 머리 주석이 은퇴한 `deploy-auto.yml` 을 현행 자동 진입점으로 설명한다. 주석만 정리(CHECK-O4O-DELIVERY-CANCELLED-RUN-REPORT-V1 「문서 정합」).
13. **[CLOUD · 2026-11-22 이후]** CI 절감 실측 — #973 · #975 · #976 · #980 병합 후 2주 Actions 사용량(`scripts/ci/actions-cost.mjs`)을 IR 추정(#976 최대 약 3,600분/월 등)과 비교해 IR 에 기록. #981 은 `CI_MAIN_REUSE` 를 켠 날부터 2주.
14. ~~별도 WO 제안: `scripts/check-forbidden-tables.mjs` 원인 정리~~ **완료** — #1006(오탐 정리 · CI 연결) · #1007(문서 정합).

**2026-11-10 LOCAL read-only 확인 후속** (branch `wo/local-readonly-results-20261110` · PR #1011)

15. **[통합 담당 판단]** 계정 삭제 `review_required` 3건(`d2776c26` · `ac8f10cf` · `3bbf0b9d`). 삭제 지연 원인 E 는 #1010 으로 해소됐다(배포 후 16~73초). `3bbf0b9d` 에 `account_activities` 검토 코드가 남아 있어 다른 회원 행에 든 사본으로 추정한다(미확인). 근거: [`WO-O4O-ADMIN-ACCOUNT-ERASURE-HANG-DIAGNOSIS-V1`](docs/work-orders/WO-O4O-ADMIN-ACCOUNT-ERASURE-HANG-DIAGNOSIS-V1.md) §5.
16. **[통합 담당]** 일부 서비스 데이터 삭제 — 운영 건수 확인 완료. 세 서비스 모두 해지 상태 0 이라 구현은 급하지 않다. 공급자 구현 WO 승인 시점은 통합 담당이 정한다. 근거: [`WO-O4O-PARTIAL-SERVICE-ADMIN-DATA-DELETION-SCOPE-V1`](docs/work-orders/WO-O4O-PARTIAL-SERVICE-ADMIN-DATA-DELETION-SCOPE-V1.md) §7-1.

## #986 배포 후 화면 확인 (사용자 · 2026-11-08 결정)

병합 전에는 합성 API 응답으로 PC(1440px) · iPhone 13 화면만 점검했다(PR 설명 「검증 결과」). 실제 계정 · 실제 데이터 확인은 **배포가 끝난 뒤 사용자가** admin.neture.co.kr 에서 한다. 운영 데이터를 바꾸는 동작(해지 · 삭제 · 저장)은 테스트용 데이터에서만 하고, 실제 회원 데이터로 삭제를 실행하지 않는다(AGENTS.md §5 테스트 데이터 경계).

- [ ] admin 사이드바 맨 위 「최종 삭제 처리」 그룹: 회원 계정 삭제 · 포럼 삭제·복구 · 커뮤니티 게시판 · 강좌 삭제 · 삭제 처리 내역 — 각각 진입 · 직접 URL 진입 · 현재 그룹 자동 펼침
- [ ] 회원 계정 삭제: '해지 회원' 탭이 먼저 열리고 안내 문구가 보이는지
- [ ] 회원 목록에서 행 선택 → 오른쪽 사이드 패널 열림 · 「다음 회원 검토」 · Esc / × 닫기 · 패널을 연 채 다른 행 선택 (PC · 모바일)
- [ ] 강좌 삭제 · 커뮤니티 게시판 화면에 보관 처리된 대상만 나오는지
- [ ] `/operations` 업무 운영 사이드바: 새 그룹(업무함·문의·알림 · 서비스 운영 · 콘텐츠·홈 · 최종 삭제(관리자)) 과 바뀐 메뉴 이름. 위임 운영자 계정(neture:operator 등)에서도 확인
- [ ] 포럼 삭제 요청 화면의 「포럼 사용 중지·재개」 탭

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
