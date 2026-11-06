# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 코드 기준: `main` `39aae45647` · 작성: 2026-11-06 (KST)
> 다음 실행자: LOCAL (운영 DB read-only 확인 항목이 있다. 코드 · 문서 항목은 CLOUD 도 가능)
> 이전 인계(2026-10-07 기준 commerce 상태표 · 로컬 검증 재현 절차) 전문: `git show 39aae45647:HANDOFF.md`

## PR #339 작업공간 — 소유 세션 확인 후 정리

PR #339의 main 통합·운영 배포는 완료됐지만 작업 PC와 소유 세션은 확인되지 않았다. 이 사실만으로 다른 세션의 작업공간을 삭제하지 않는다.

1. 다른 세션은 `git worktree list`로 해당 branch/worktree의 존재만 확인하고 `KEEP` 또는 `UNCERTAIN`으로 보고한다. branch만 남아 있어도 임의로 삭제하지 않는다.
2. 원래 소유 세션이 자기 작업공간임을 확인한 경우에만 [AGENTS.md §4-1(i)](AGENTS.md#4-1-parallel-session--worktree-policy)의 main 포함·clean·남은 작업 및 다른 세션 사용 여부를 확인한다. Windows는 junction 해제·재스캔까지 통과해야 한다.
3. 조건을 모두 충족한 원래 소유 세션만 자기 worktree와 branch를 정리한다. 불명확하면 보존하고 정확한 차단 사유를 보고한다. 원격 branch도 소유권·후속 사용 여부 확인 없이 삭제하지 않는다.
4. 소유 세션의 실제 정리 완료 확인 후에만 이 안내를 제거한다. 이 문서 변경은 기존 작업공간을 정리했다는 증거가 아니다.

2026-11-06 조회: PR #339 MERGED · 원격 branch 없음. 포맷한 PC의 `git worktree list` 에는 해당 worktree 가 없다. 다른 PC 존재 여부와 소유 세션은 여전히 미확인이라 위 안내를 유지한다.

## 요약

개발 PC 포맷 후 작업 환경을 다시 구성했고, 2026-10-07 기준으로 멈춰 있던 이 문서를 현행화했다. 코드 변경은 없다.

## 완료된 것

- 기준 checkout 재구성 · `pnpm install --frozen-lockfile` 성공 · `pnpm run check:runtime` PASS.
- 이전 인계의 PR #308 · #332 · #336 · #328 · #325 는 모두 MERGED (2026-11-06 조회).
- `services/web-pharmacy-hub` 는 저장소에 없다. 코드상 제거 근거는 `f58add7aa7`(2026-10-17) · `36e92381a5`(2026-10-20)이다. GCP 자원 삭제 여부는 미확인이다.

## 진행 중인 것

- 열린 PR 0건 (2026-11-06 조회).
- 이 문서 현행화 외에 진행 중인 worktree 없음. `wo/handoff-refresh-20261106` 은 PR 미생성이며 main 통합은 통합 담당 몫이다.

## 이전 인계에서 바뀐 전제

- 2026-10-20 사용자 결정으로 `pharmacy` · `drugstore` · `pharmcoop` · `carepharm` 이 동급 독립 사업이 됐다 — [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](docs/work-orders/WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md)(OPEN).
- 그래서 이전 인계의 "세미프랜차이즈 담당 운영자 지정 → 가입 · 승인 · 주문 운영 검증" 순서는 그대로 수행할 수 없다. 재검증이 필요하면 현행 사업 구조 기준으로 다시 정한다. 그 후 재검증이 이뤄졌는지는 이번에 확인하지 않았다.
- commerce 잔여 작업의 정본은 [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) TODO 다 (미완료 5건: 3-4 · 6-2 · 6-2d · 6-4 · 6-5). 이 문서에 복제하지 않는다.

## 다음에 할 일 (우선순위 순)

1. `wo/readonly-db-rule`(`c01aa01292`) main 통합 여부 결정 — PR 없음 · main 미반영. 운영 DB 조회를 `o4o_readonly` 계정으로 제한하는 규칙(`AGENTS.md` · `SETUP.md` · `db-readonly` 스킬)이다. 통합 전까지 main 문서는 조회에 `o4o_api_v2` 를 안내한다. 통합은 통합 담당 몫이다.
2. 미완료 지시서의 남은 확인. 체크박스는 기록 시점 값이므로 아래 2026-11-06 조회값을 따른다. 운영 DB 확인은 LOCAL read-only 로 하고 write 는 사용자 승인을 받는다.
   - `TODO-O4O-ACCOUNT-ERASURE-ACTIVATION-V1` — PR #936 MERGED. `account-erasure-activation.yml` 실행 0건이라 운영 활성화는 아직 안 된 것으로 본다.
   - `TODO-O4O-MEMBER-PROFILE-EDIT-V1` — migration `1793750400000-AddTemporaryPasswordExpiry` 는 main 에 있다. 운영 적용 여부는 미확인.
   - `WO-O4O-ADMIN-OPERATOR-INVITE-FIRST-V1` — PR #925 MERGED. 운영 migration 적용 여부는 미확인.
   - `TODO-O4O-OPERATOR-PROTECTED-MEMBER-DEPLOY-FIX-V1` — #951 main 반영 · Promote `051b7ede63` success(`deploy-kpa-branch` 포함). 약국협업체 frontend-only 배포 · 최종 HTTP 점검은 미확인.
   - `WO-O4O-SCHEDULED-JEST-FULL-SHARD-RECOVERY-V1` — `8eb3dab7dc` main 반영 · 최근 스케줄 실행(2026-11-05 23:03Z) success. 집계 · 메모리 기록은 미확인.
3. 새 개발 후보(사용자 선택): `WO-O4O-COMMUNITY-INDUSTRY-NEWS-V2` · `WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1`(둘 다 DRAFT) · `WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1` · `TODO-O4O-PLAYLIST-AUTHORING-REQUIRED-20261105` 잔여.

`wo/member-signup-approval-action` 은 대조 완료 — 커밋 `aea4fa8736` 이 PR #956(MERGED)에 포함돼 있어 추가 통합이 필요 없다.

## 이 PC 의 미해결 환경

- 로컬 전용 파일 없음: `docs/local/TEST-ACCOUNTS.local.md`(브라우저 검증 전 사용자 원본 필요) · `apps/api-server/.env`(`.env.example` 로 새로 작성).
- 미설치: PostgreSQL 15 · gcloud · Cloud SQL Proxy · Docker. 운영 DB read-only 확인(위 2번)에는 gcloud 와 proxy 가 필요하다.
- Claude 앱의 worktree 위치가 저장소 안(`.claude/worktrees`)이다. §4-1(a) 에 맞게 사용자가 Settings 에서 바꿔야 한다.

## 주의

- 다른 PC 의 worktree 는 이 PC 에서 정리하지 않는다. main 반영은 PR merge 하나뿐이다. 저장소 Public — 실명 · 자격증명 기록 금지.
- D 드라이브는 작업에 쓰지 않는다(사용자 결정 2026-11-07). 그곳의 포맷 전 worktree 는 정비 전 자료이며 참조 · 대조하지 않는다. push 되지 않은 변경 유무는 확인하지 않았다.
