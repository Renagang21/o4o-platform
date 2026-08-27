# CHECK-O4O-CHANNEL-RETIREMENT-ADMIN-AUTH-GUARD-RESIDUAL-CLOSURE-V1

WO: `WO-O4O-CHANNEL-RETIREMENT-ADMIN-AUTH-GUARD-RESIDUAL-CLOSURE-V1`
일자: 2026-08-27
기준 commit: `origin/main = 5fdab9466b8464a9417c70db02d487e56303faa0`
작업 위치: 격리 worktree `C:/tmp/o4o-b2b-buyer-order-read` (branch `work/channel-retirement-auth-guard-residual-v1`)

성격: **새 기능 수정이 아니라, 은퇴된 runtime 과 guard spec 계약을 맞추는 잔여 정리.**

---

## §2 시작 기준 — 편차 보고

메인 저장소 `C:/Users/home/coding/o4o-platform`:

- `git branch --show-current` = `main`
- `git rev-parse HEAD` == `git rev-parse origin/main` == `5fdab9466`
- `git status --short` = **dirty** — 다른 세션 WIP 8건
  - `.github/workflows/e2e-auth-runtime.yml`
  - `docs/checks/WO-O4O-KPA-AUTH-RUNTIME-E2E-LOGIN-REGRESSION-ROOT-CAUSE-AND-CI-CLOSURE-V1-CHECK.md`
  - `e2e/auth-runtime/*` (6건)

WO §2 의 "dirty 면 중지" 를 문자 그대로 적용하면 정지 대상이나, 해당 WIP 는 이번 수정 대상
(`apps/api-server/src/bootstrap/__tests__/`) 와 **경로가 완전히 분리**되어 있어 §14 의
"다른 세션 WIP 와 직접 충돌" 에 해당하지 않는다. 타 세션 파일을 **수정/restore/stash/stage 하지 않고**,
`origin/main` 에서 만든 **깨끗한 격리 worktree** 에서 진행했다. (편차는 사용자에게 사전 보고함.)

---

## §3 수정 전 재현

```
cd apps/api-server
npx jest src/bootstrap/__tests__/admin-route-auth-boundary.test.ts
→ Tests: 3 failed, 31 passed, 34 total
```

실패 3건 (모두 `admin-route-auth-boundary.test.ts:205:27`, `ENOENT: no such file or directory`):

| 실패 테스트 | ENOENT 대상 경로 |
|---|---|
| `channel-playback-logs router 는 자기 인증을 명시한다` | `apps/api-server/src/routes/admin/channel-playback-logs.routes.ts` |
| `channel-heartbeat router 는 자기 인증을 명시한다` | `apps/api-server/src/routes/admin/channel-heartbeat.routes.ts` |
| `channel-ops router 는 자기 인증을 명시한다` | `apps/api-server/src/routes/admin/channel-ops.routes.ts` |

해당 spec 안의 **다른 실패는 없음**. 나머지 31건은 수정 전에도 통과.

---

## §4 잔여 참조 census (미조사 0)

### 4-1. 삭제된 router 실재 확인

```
ls apps/api-server/src/routes/admin/ | grep -i "channel\|ops-metrics"
→ ops-metrics.routes.ts        (유일)
```

`channel-playback-logs` / `channel-heartbeat` / `channel-ops` 3개 router 는 실제로 은퇴 상태.
→ §14 "삭제된 3개 router 중 하나가 main 에 다시 살아 있음" 중지 조건 **미해당**.

### 4-2. spec 내 Channel 은퇴 대상 참조

`admin-route-auth-boundary.test.ts` 안의 `channel` 문자열은 **199–201행 3줄이 전부**
(`BLANKET_DEPENDENT_ROUTERS` 배열 원소). 그 외 import/describe/주석에 channel 참조 없음.

### 4-3. 저장소 전체 — 은퇴 admin router 경로 literal / raw-source test

`routes/admin/` 경로 literal 을 담은 test·spec 전수:

| 위치 | 내용 | 분류 |
|---|---|---|
| `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts:54,138,147` | `dashboard.routes` (현존) | `ACTIVE_REFERENCE` |
| `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts:199–201` | 은퇴 3개 router 존재를 **강제** | `RETIRED_RESIDUAL` → 이번 제거 대상 |
| `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts:43–45` | 같은 3개 경로의 **비존재**를 단언 (은퇴 가드, 방향이 반대) | `ACTIVE_REFERENCE` (유지) |
| `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts:80` | `app.use('/api/v1/admin/channel-playback-logs'` 미등록 단언 | `ACTIVE_REFERENCE` (유지) |
| `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx:223` | `// [RETIRED] cms-channels / cms-channel-ops — WO-…-RETIREMENT-…-V1` 주석 | `DOC/HISTORY_ONLY` |
| `tmp/admin-product-description-auth-boundary/smoke.mjs:48`, `route-inventory.json:408,410,419,428` | 과거 조사용 scratch 산출물, 테스트 아님 | `DOC/HISTORY_ONLY` |

**은퇴된 admin router 파일의 존재를 강제하는 참조는 `admin-route-auth-boundary.test.ts:199–201` 단 1곳.**
다른 raw-source spec 이 은퇴 router 존재를 강제하는 사례 **0건** (전체 Jest 212 suite green 으로도 교차 확인).

---

## §5 수정 (최소)

`apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts`

```diff
   const BLANKET_DEPENDENT_ROUTERS = [
     'ops-metrics',
-    'channel-playback-logs',
-    'channel-heartbeat',
-    'channel-ops',
   ];
```

제거한 항목 3개: `channel-playback-logs`, `channel-heartbeat`, `channel-ops`.
`ops-metrics` 검사는 **그대로 유지**. 변경 파일 1개, hunk 1개, 3줄 삭제.

금지 사항 준수 확인:

- 삭제된 router 복구 — 없음
- Channel endpoint 재등록 — 없음
- auth guard 완화 — 없음 (assertion 정규식·`ops-metrics` 검사 무변경)
- 다른 admin router 항목 정리 — 없음
- unrelated test refactor — 없음
- signage runtime 재활성화 — 없음
- 테스트 삭제/skip — 없음 (`it.each` 원소만 감소)

---

## §6 Channel 은퇴 guard 회귀

```
npx jest src/__tests__/channels-stack-retirement.spec.ts
→ PASS
```

- `/api/v1/channels*` 은퇴 유지 — PASS
- admin channel ops / playback / heartbeat routes 미복구 — PASS
- Channel admin menu·page 미복구 — PASS
- signage-player channel route 미복구 — PASS

---

## §7 Guard spec 단독 검증

```
npx jest src/bootstrap/__tests__/admin-route-auth-boundary.test.ts \
         src/__tests__/channels-stack-retirement.spec.ts
→ Test Suites: 2 passed, 2 total
→ Tests:       73 passed, 73 total
```

`admin-route-auth-boundary.test.ts` = 31 passed / 31 total.
수정 전 31 passed 와 **동일한 31건**이 그대로 통과 — 사라진 것은 ENOENT 3건뿐이고
기존 active admin router auth 검사는 전부 보존됐다.

---

## §8 API 관련 회귀

- `channels-stack-retirement.spec.ts` — PASS
- `admin-route-auth-boundary.test.ts` — PASS
- bootstrap/admin route 관련 spec — 전체 Jest 에 포함, PASS (§9)

---

## §9 전체 검증 (CI 순서와 동일)

`build:packages` 산출 `dist/` 로 lint 가 오염되지 않도록 `ci-pipeline.yml` 의 Code Quality Check 순서를 따랐다.

| 단계 | 명령 | 결과 |
|---|---|---|
| type-check (api-server) | `cd apps/api-server && npx tsc --noEmit` | **exit 0**, 0 errors |
| ESLint regression ratchet | `node scripts/lint-ratchet.mjs` | **exit 0** — `64 errors, 2185 warnings (error baseline 69)` |
| unsafe route guard | `node scripts/check-unsafe-routes.mjs` | **exit 0** |
| TypeORM entity registry guard | `node scripts/check-typeorm-entities.mjs` | **exit 0** |
| api-server 전체 Jest | `cd apps/api-server && npx jest` | **exit 0** — `212 passed, 212 total` / `3561 passed, 3561 total` |

lint-ratchet 이 남긴 `::notice::` (baseline 69 → 64 로 낮추라는 안내) 는 **실패가 아니며**
이번 수정과 무관한 기존 상태다. baseline 조정은 이번 WO 범위 밖이라 건드리지 않았다.

---

## §10 CI Pipeline 실제 확인

push: `dd0ce9e48..5917ea0e4` (branch `main`)

### 10-1. 수정 직전 main 의 실제 실패 (대조군)

run `33034146350` (commit `dd0ce9e48`) — **failure**

```
FAIL src/bootstrap/__tests__/admin-route-auth-boundary.test.ts
Test Suites: 1 failed, 211 passed, 212 total
Tests:       3 failed, 3561 passed, 3564 total
##[error]Process completed with exit code 1.
```

즉 main 의 CI 실패는 **오직 이 spec 1개 / 3 tests** 이었다.

### 10-2. 내 commit 의 첫 run — cancelled (실패 아님)

run `33034731120` (commit `5917ea0e4`) — **cancelled**
사유: `Canceling since a higher priority waiting request for ci-CI Pipeline-refs/heads/main exists`
— 다른 세션이 바로 위에 `fe74f6ec1` 을 push 해 concurrency 그룹이 선행 run 을 취소했다.
테스트 실패가 아니다.

### 10-3. 내 commit 을 포함한 후속 run — **SUCCESS**

run `33035062106` (commit `fe74f6ec1`, `5917ea0e4` 포함) — **✓ success**

| Job | 결과 |
|---|---|
| Code Quality Check (98395922617) | ✓ success, 9m25s |
| Build Applications (admin-dashboard) (98397405915) | ✓ success, 3m8s |

`Code Quality Check → Run tests (api-server Jest, serial to prevent OOM)`:

```
Test Suites: 212 passed, 212 total
Tests:       3561 passed, 3561 total
```

수정 전 `1 failed / 3 failed` → 수정 후 `212 passed / 3561 passed`. **CI Pipeline green 복구 확인.**

annotation 은 2종만 남았고 둘 다 실패가 아니다:
Node.js 20 deprecation 경고, lint-ratchet 의 `ERROR_BASELINE` 하향 권장 notice.

### 10-4. 그 외 workflow

`CodeQL Security Analysis` / `Deploy API Server (Cloud Run)` 는 별도 workflow 이며
WO §10 에 따라 이번 판정 대상이 아니다.

---

## §13 backup branch `backup/pre-reset-main-20260826` — 보고만, 삭제하지 않음

이번 WO 코드 수정 범위 아님. 삭제 가능 여부만 조사했다.

- 원격에 사본 없음 (`git ls-remote --heads origin "*pre-reset-main*"` → 결과 없음). **로컬 전용 branch.**
- `git log --oneline origin/main..backup/pre-reset-main-20260826` → 8 commits
- `git cherry origin/main backup/pre-reset-main-20260826`:
  - `-` (origin/main 에 patch-equivalent 로 이미 존재) **7건**:
    `15f958c08`, `5ebee0e28`, `4a4d2ccb8`, `d56bd7c77`, `4dfb7fb97`, `ef4a50729`, `563a13a1f`
  - `+` (고유) **1건**: `b37fa70c0 fix(signage-player): channel code lookup 을 canonical /channels/code/:code 로 수렴`

유일한 고유 commit `b37fa70c0` 은 **은퇴된 Channel stack 을 사용하는 변경**이며, 이미 앞선 세션에서
drop 대상으로 보고된 commit 이다. 즉 이 backup branch 에는 보존 가치가 있는 고유 내용이 없다.

**판정: CI Pipeline green 확인 후 삭제해도 안전.** 단 WO §13 에 따라 **이번 WO 에서 삭제하지 않았다.**
삭제는 해당 branch 를 만든 세션/사용자의 결정으로 남긴다.

---

## 부록 — Git

- 변경 파일: `apps/api-server/src/bootstrap/__tests__/admin-route-auth-boundary.test.ts` (수정)
- 신규 파일: `docs/checks/CHECK-O4O-CHANNEL-RETIREMENT-ADMIN-AUTH-GUARD-RESIDUAL-CLOSURE-V1.md`
- path-specific stage 만 사용, `git add .` 미사용
- 타 세션 WIP 미접촉
