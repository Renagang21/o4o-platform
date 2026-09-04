# CHECK-O4O-DIGITAL-SIGNAGE-AGENT-DEAD-RUNTIME-RETIREMENT-V1

> **WO**: WO-O4O-DIGITAL-SIGNAGE-AGENT-DEAD-RUNTIME-RETIREMENT-V1
> **작성일**: 2026-09-04
> **상태**: 실행 완료

---

## 1. 기준 SHA

| 항목 | 값 |
|---|---|
| base SHA | `eff7816d0` (PR #193 merge 직후 `origin/main`) |
| 작업 branch | `work/digital-signage-agent-dead-runtime-retirement-v1` |
| 작업 위치 | 격리 worktree `C:/tmp/o4o-dsa-retire` |

주 저장소 작업트리에 다른 세션의 B2B WIP(11 modified · 5 untracked)가 있어
**해당 파일을 수정·삭제·stash 하지 않고** 격리 worktree 에서 진행했다.

---

## 2. 전체 census (미조사 0)

`apps/digital-signage-agent` 총 **13 files / 1,921 LOC**.

| 파일 | 분류 |
|---|---|
| `src/index.ts` | DEAD_RUNTIME — entry point, 어떤 빌드/배포에서도 실행되지 않음 |
| `src/agent/AgentBootstrap.ts` · `AgentConfig.ts` · `AgentLogger.ts` | DEAD_RUNTIME |
| `src/agent/AgentRegistrar.ts` · `AgentHeartbeat.ts` · `ActionHandler.ts` | DEAD_RUNTIME — API caller |
| `src/comm/CoreSocketClient.ts` · `FallbackHttpClient.ts` | DEAD_RUNTIME — API caller |
| `src/player/LocalPlayer.ts` | DEAD_RUNTIME |
| `package.json` · `tsconfig.json` | DEAD_RUNTIME — workspace registration |
| `README.md` | DEAD_RUNTIME — 앱 내부 문서 (앱과 함께 제거) |

```text
전체 파일: 13
ACTIVE_RUNTIME: 0
DEAD_RUNTIME: 13
TEST_ONLY: 0
DOC_ONLY: 0
DEFER_POLICY: 0
미조사: 0
```

---

## 3. `/api/digital-signage/*` caller ↔ backend mount

agent 가 호출하는 endpoint 전수:

| 호출 위치 | 경로 | backend mount |
|---|---|---|
| `AgentRegistrar.ts:89` | `POST /api/digital-signage/displays/register` | **0** |
| `FallbackHttpClient.ts:138` | `POST /api/digital-signage/displays/register` | **0** |
| `FallbackHttpClient.ts:107` | `POST /api/digital-signage/agent/heartbeat` | **0** |
| `FallbackHttpClient.ts:118` | `POST /api/digital-signage/actions/{id}/status` | **0** |
| `FallbackHttpClient.ts:131` | `GET /api/digital-signage/agent/pending-actions` | **0** |
| `ActionHandler.ts:159` | `POST /api/signage/{serviceKey}/public/playback/log` | **존재** (`signage-public.routes.ts:310`) |

`apps/api-server/src` 전수 검색 결과 `/api/digital-signage` route·mount·controller **0건**.
`displays/register` · `pending-actions` · `agent/heartbeat` 문자열도 `apps` `packages` 전체에서 **0건**.

마지막 항목만 실존 endpoint 를 향하지만, 이는 **누구나 호출 가능한 public playback log** 이고
저장소 전체에서 이 경로를 호출하는 다른 코드는 **agent 뿐**이었다.
즉 agent 제거로 사라지는 것은 caller 이며 endpoint(ACTIVE_RUNTIME)는 그대로 유지된다.

**WO §9 준수** — mount 0 인 endpoint 를 새로 만들어 agent 를 살리지 않았다.

---

## 4. production deploy 조사

| 확인 | 결과 |
|---|---|
| `gcloud run services list` | 11개 서비스 — `digital-signage-agent` **없음** |
| `.github/workflows/**` | agent 참조 **0건** (deploy-api.yml 은 `@o4o-apps/digital-signage-core` 빌드만, deploy-web-services.yml 은 `signage-player-web` 전용) |
| Dockerfile | agent 전용 Dockerfile **없음** |
| infra / service manifest | 참조 **0건** |

`signage-player-web` 은 Cloud Run 에 실제 배포된 **별개의 ACTIVE 서비스**이며,
`/api/digital-signage/*` 도 agent 도 참조하지 않는다(검색 0건) — 이번 삭제와 무관하다.

---

## 5. workspace / build / import 등록

| 축 | 결과 |
|---|---|
| `pnpm-workspace.yaml` | `apps/*` glob 로 포함 — 디렉터리 삭제로 자동 해제 (파일 수정 불필요) |
| root `package.json` build script | agent 참조 **0건** (`build:packages` · `build:apps` 어디에도 없음) |
| tsconfig references | **0건** |
| `@o4o/digital-signage-agent` import | 저장소 전체 **0건** (자기 `package.json` 의 name 필드 외) |
| turbo/기타 build config | 참조 **0건** |
| AppStore / appsCatalog | agent 미등록 (`appId: 'digital-signage-core'` 는 별개 package) |

---

## 6. dependency / lockfile 영향

agent 전용 dependency(`socket.io-client` · `uuid` · `axios` · `eventemitter3` + dev 4종)는
모두 다른 workspace 에서도 쓰이므로 root 차원 제거는 발생하지 않는다.

`pnpm-lock.yaml` 은 **importer 블록 1개 제거**만 발생했다.

```text
pnpm-lock.yaml | 1 insertion(+), 28 deletions(-)
  - apps/digital-signage-agent importer 28줄 삭제
  + ts-node 스냅샷에 optional: true 1줄 (agent 가 유일한 비-optional 소비처였던 결과)
```

`pnpm install --frozen-lockfile` **PASS** — lockfile 이 workspace 와 동기화됨을 검증했다.

`digital-signage-core` 의 `express` · `@types/express` 잔여 dependency 는 **다음 WO 범위**이므로
이번 작업에 섞지 않았다 (WO §12).

---

## 7. 삭제 결과

```text
apps/digital-signage-agent/**  13 files 삭제
pnpm-lock.yaml                 importer 1블록 제거
```

문서(`docs/**`)는 **1건도 삭제하지 않았다** — 전부 과거 시점 기록이다 (WO §6).

---

## 8. 삭제 후 residual census (WO §15)

| 검색어 | 결과 | 분류 |
|---|---|---|
| `digital-signage-agent` (코드·config·workflow) | **0건** | — |
| `api/digital-signage` (코드) | **0건** | — |
| `@o4o/digital-signage-agent` | **0건** | — |
| Cloud Run service name | **0건** | — |
| `digital-signage-agent` (docs) | 6건 | `docs/archive/**` 1 · `docs/checks/**` 4 = **EXPECTED_HISTORY** / `docs/services/_core/apps/digital-signage-core/app-definition.md` = **DOC_ONLY** |

```text
UNEXPECTED_RESIDUAL: 0
```

`app-definition.md` 는 "Media List, Display, Display Slot | 렌더링 → digital-signage-agent",
"digital-signage-agent와 연동" 2줄로 현재 구조와 어긋난다. 내용 변경은 CLAUDE.md §16-4 상
인라인 금지이므로 **별도 WO 로 보고**한다.

---

## 9. 검증 결과 (WO §16)

| # | 항목 | 결과 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | **PASS** (lockfile ↔ workspace 동기화 검증) |
| 2 | `node scripts/lint-ratchet.mjs` | **PASS** — 59 errors / 1,649 warnings (baseline 62). agent 삭제로 error 62 → **59** |
| 3 | `scripts/appstore-guard.ts` | **PASS** — 14 packages, Catalog 14/14, FROZEN Core 무결 |
| 4 | api-server `tsc --noEmit` | 25 errors — **전부 TS2307**(미빌드 workspace package). signage/agent 관련 **0건**, 본 변경과 무관 |
| 5 | Signage / forced-content / Channel retirement / app-management guard (11 suite) | **PASS — 11 suites / 320 tests** |
| 6 | api-server 전체 Jest | **PASS — 218 suites / 3,611 tests** |

### 9-1. 전체 Jest

```text
Test Suites: 218 passed, 218 total
Tests:       3611 passed, 3611 total
```

삭제로 인해 깨진 suite 0건. 갱신·삭제한 test 도 0건이다(agent 를 참조하는 test 가 애초에 없었다).

### 9-2. lint baseline 미하향 사유

ratchet 이 `ERROR_BASELINE` 을 59 로 낮추라고 notice 를 냈으나 **하향하지 않았다.**
현재 다른 세션의 in-flight branch 들은 구 main 기준 62 errors 이므로,
baseline 을 59 로 낮추면 그 PR 들의 CI 가 본 변경과 무관하게 깨진다.
별도 WO 로 일괄 하향을 제안한다.

---

## 10. 회귀 확인 (WO §7 · §8)

| 항목 | 상태 |
|---|---|
| Tablet ScreenSet canonical path | 미접촉 |
| `signage_forced_content` · `target_surface` 계약 | 미접촉 (guard 3종 PASS) |
| store-playlist canonical runtime | 미접촉 |
| `DigitalSignageRouter` · `v2/ContentHub` · `lib/api/signageV2.ts` | 미접촉 |
| `SignageCoreEntities` | 미접촉 |
| Phase-6 entity 7종 · physical signage tables | 미접촉 |
| Channel runtime 부활 (`/api/v1/channels*` · ChannelPlayer · heartbeat · playback-log) | **0** — Channel retirement guard PASS |
| `/api/signage/{serviceKey}/public/playback/log` endpoint | 유지 (ACTIVE_RUNTIME) |
| production write / DELETE | **0** — `gcloud run services list` read-only 조회만 수행 |
| schema change · table DROP · migration | **0 / 0 / 0** |
| test skip | **0** |
| stale guard 정리 | 해당 없음 — agent 파일 존재를 강제하는 test **0건** |

---

## 11. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

1. `docs/services/_core/apps/digital-signage-core/app-definition.md` — 삭제된 agent 연동 서술 2줄 정정
2. `digital-signage-core` 의 `express` · `@types/express` 잔여 dependency 정리
3. `scripts/lint-ratchet.mjs` `ERROR_BASELINE` 62 → 59 하향 (in-flight branch 정리 후)

그 다음 순서로 Phase-6 entity 7종 + 물리 테이블 처분 판단이 남는다.
