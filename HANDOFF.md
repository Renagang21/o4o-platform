# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `wo/coop-member-test-race` · 코드 기준: `363ff25eb2` · 작성: 2026-11-07 (KST)
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

- `wo/coop-member-test-race`(worktree `o4o-wt/coop-member-test-race`) — PR 미생성. `services/web-pharmacy-coop/src/Management.test.tsx` 의 간헐 실패를 고쳤다. 조합원 패널이 행 표시 뒤 effect 로 선택을 초기화하는데, 그 effect 전에 클릭이 먼저 들어가면 선택이 풀려 작업 버튼이 사라졌다. 임시 테스트로 이 순서를 강제해 재현했고, 테스트에서 effect 처리를 기다리게 했다. 제품 코드는 그대로다. 수정 전 코드도 부하 15회 전부 통과해 드문 실패이므로, 반복 통과는 수정 효과의 근거가 아니다. main 통합은 통합 담당 몫이다.

## 이전 인계에서 바뀐 전제

- 2026-10-20 사용자 결정으로 `pharmacy` · `drugstore` · `pharmcoop` · `carepharm` 이 동급 독립 사업이 됐다 — [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](docs/work-orders/WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md)(OPEN).
- 그래서 이전 인계의 "세미프랜차이즈 담당 운영자 지정 → 가입 · 승인 · 주문 운영 검증" 순서는 그대로 수행할 수 없다. 재검증이 필요하면 현행 사업 구조 기준으로 다시 정한다. 그 후 재검증이 이뤄졌는지는 이번에 확인하지 않았다.
- commerce 잔여 작업의 정본은 [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) TODO 다 (미완료 5건: 3-4 · 6-2 · 6-2d · 6-4 · 6-5). 이 문서에 복제하지 않는다.

## 다음에 할 일 (우선순위 순)

1. 계정 완전삭제 운영 활성화 여부 결정(사용자 승인 필요) — `TODO-O4O-ACCOUNT-ERASURE-ACTIVATION-V1`. PR #936 MERGED 지만 운영 API 에 `ACCOUNT_ERASURE_*` 설정 4개가 모두 없어 OFF 다(2026-11-07 조회). `account-erasure-activation.yml` 실행 0건. 활성화는 운영 영향이 있어 임의로 실행하지 않는다.
2. 새 개발 후보(사용자 선택): `WO-O4O-COMMUNITY-INDUSTRY-NEWS-V2` · `WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1`(둘 다 DRAFT) · `WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1` · `TODO-O4O-PLAYLIST-AUTHORING-REQUIRED-20261105` 잔여.

## 확인 결과 (2026-11-07 조회)

체크박스는 기록 시점 값이라 지시서에 비어 있어도 아래가 현재 상태다.

- 운영 API 서빙 SHA 는 `5106df8666` 이다. 사용자 계정 수동 Promote 로 배포됐고 이 세션이 실행한 것은 아니다.
- `o4o_readonly` · secret `o4o-db-readonly-password` 는 존재한다. `psql` 미설치로 실제 접속과 조회 권한은 미확인.
- `TODO-O4O-MEMBER-PROFILE-EDIT-V1` · `WO-O4O-ADMIN-OPERATOR-INVITE-FIRST-V1` — 해당 migration 커밋 이후의 `o4o-api-migrations` Job 이 모두 성공했다(최근 2026-11-06 23:38Z). DB 를 직접 조회한 값은 아니다.
- `TODO-O4O-OPERATOR-PROTECTED-MEMBER-DEPLOY-FIX-V1` — `cooperative-web` 서빙 SHA `dd83d30d29`(#950 포함). `drugstore.neture.co.kr` · `kpa.neture.co.kr` 공개 진입 HTTP 200. 화면 동작 검증은 아니다.
- `WO-O4O-SCHEDULED-JEST-FULL-SHARD-RECOVERY-V1` — 2026-11-06 22:33Z 스케줄 실행에서 3분할과 집계가 모두 success. 메모리 기록 값은 미확인.
- 대조 완료: `wo/readonly-db-rule` 은 PR #961 로 main 반영(`ed8bc1367c`), `wo/member-signup-approval-action` 은 커밋 `aea4fa8736` 이 PR #956(MERGED)에 포함돼 있어 추가 통합이 필요 없다.

## 이 PC 의 미해결 환경

- 로컬 전용 파일 없음: `docs/local/TEST-ACCOUNTS.local.md`(브라우저 검증 전 사용자 원본 필요) · `apps/api-server/.env`(`.env.example` 로 새로 작성).
- gcloud · Cloud SQL Proxy 는 설치 · 로그인 완료. 미설치: PostgreSQL 15(`psql` 포함) · Docker. 운영 DB 를 직접 조회하려면 `psql` 이 필요하다.
- Claude 앱의 worktree 위치가 저장소 안(`.claude/worktrees`)이다. §4-1(a) 에 맞게 사용자가 Settings 에서 바꿔야 한다.

## 주의

- 다른 PC 의 worktree 는 이 PC 에서 정리하지 않는다. main 반영은 PR merge 하나뿐이다. 저장소 Public — 실명 · 자격증명 기록 금지.
- D 드라이브는 작업에 쓰지 않는다(사용자 결정 2026-11-07). 그곳의 포맷 전 worktree 는 정비 전 자료이며 참조 · 대조하지 않는다. push 되지 않은 변경 유무는 확인하지 않았다.
