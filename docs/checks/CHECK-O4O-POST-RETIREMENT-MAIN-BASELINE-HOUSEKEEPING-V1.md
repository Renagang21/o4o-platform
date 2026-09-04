# CHECK-O4O-POST-RETIREMENT-MAIN-BASELINE-HOUSEKEEPING-V1

**대상 WO**: WO-O4O-POST-RETIREMENT-MAIN-BASELINE-HOUSEKEEPING-V1
**시작 HEAD**: `c67a0ff1f` (main, `HEAD == origin/main`)
**작성일**: 2026-09-04

---

## 0. 최종 판정

```text
POST_RETIREMENT_HOUSEKEEPING          = CLOSED_WITH_DOCUMENTED_RESIDUE
ACTIVE_REMOVED_SCHEMA_REFERENCE       = 0
ACTIVE_BLOCK_CORE_REFERENCE           = 0
ACTIVE_PERMISSION_GUARD_REFERENCE     = 0
CHANNEL_RUNTIME_REACTIVATION          = 0
CHANNEL_SCHEMA_UNAPPROVED_CHANGE      = 0
CAFE24_B2B_LOGIN_REGRESSION           = PASS
```

`CLOSED` 가 아니라 `CLOSED_WITH_DOCUMENTED_RESIDUE` 인 이유: 잔재 파일 1개(`scripts/audit/shortcode-registry-report.json`)를
**삭제 권한이 차단**되어 제거하지 못했다(§6-2). 코드·테스트·빌드는 전부 green 이다.

---

## 1. 발견 항목 분류표

| # | 항목 | 분류 | 조치 |
|:--:|---|---|---|
| 1 | `ops-metrics.routes.ts` 가 은퇴한 `channels`·`channel_heartbeats` 를 repository 로 직접 read | **ACTIVE_DEFECT** | **수정** |
| 2 | `store-slug-store-id-axis` census 가 Cafe24 파일럿의 9번째 `reserveSlug` 호출부를 등재하지 않아 red | **ACTIVE_DEFECT** | **수정** |
| 3 | `packages/block-core` 잔재 디렉터리 → 은퇴 guard 1건 red | 작업공간 잔재 | **제거**(사용자 승인) |
| 4 | `packages/ecommerce-core` 잔재 디렉터리 → 은퇴 guard 1건 red | 작업공간 잔재 | **제거** |
| 5 | `packages/shortcodes` 잔재 디렉터리 → 은퇴 guard 1건 red | 작업공간 잔재 | **제거** |
| 6 | `packages/cosmetics-seller-extension` 잔재 디렉터리 → 은퇴 guard 1건 red | 작업공간 잔재 | **제거** |
| 7 | `Cafe24B2bStoreProvisioningService` type 오류 (`'cafe24-b2b'` not assignable) | **FALSE_POSITIVE** (stale dist) | `platform-core` 빌드로 해소 |
| 8 | `platform-core` 가 `build:packages` 에 없음 | 빌드 설정 공백 | **보고만** (§7-1) |
| 9 | ops-metrics 의 `services`·`opsStatus` 가 구조적으로 항상 0 | 설계 판단 필요 | **보고만** (§7-2) |
| 10 | `scripts/audit/shortcode-registry-report.json` 잔재 | 작업공간 잔재 | **미제거**(권한 차단) |
| 11 | `users.permissions` / `store_events` / `PermissionGuard` / `dist-node` 참조 | HISTORICAL_MIGRATION · DOCUMENTATION_RECORD · TEST_OR_FIXTURE | **유지** |
| 12 | `channels` 3테이블·entity·migration 보존 | INTENTIONAL_SCHEMA_PRESERVATION | **유지** |

**ACTIVE_DEFECT 2건 — 모두 수정 완료.**

---

## 2. 조사 범위와 검색어

```text
범위: apps · packages · services · scripts · .github
      (node_modules · dist · .vite-cache 제외)

검색어:
  users.permissions · u.permissions · user.permissions · permissions 컬럼 SQL
  store_events · StoreEvent
  block-core · @o4o/block-core · blockCore
  PermissionGuard
  dist-node
  createChannelRoutes · getRepository(Channel|ChannelHeartbeat|ChannelPlaybackLog)
  channels / channel_heartbeats / channel_playback_logs (raw SQL)
```

---

## 3. ACTIVE_DEFECT #1 — ops-metrics 의 은퇴 테이블 runtime 접근

### 3-1. 무엇이 문제였나

`GET /api/v1/admin/ops/metrics` 가 은퇴한 Channel 축을 **계속 읽고 있었다**.

```ts
const channelRepo   = dataSource.getRepository(Channel);          // channels
const heartbeatRepo = dataSource.getRepository(ChannelHeartbeat); // channel_heartbeats
const channels = await channelRepo.find();
for (const channel of channels) { await heartbeatRepo.findOne(...) }   // ×2 (metrics + opsStatus)
```

선행 WO(`…SIGNAGE-CHANNEL-STACK-RETIREMENT…`)는 **route·admin UI·player** 를 은퇴시켰지만
이 파일은 route factory 를 쓰지 않고 **entity 를 직접 import** 해서 소비하고 있었다.
그래서 `createChannelRoutes` · `/api/v1/channels` · `ChannelPlayerPage` 검색에 걸리지 않았다.

WO §4-D 원칙 그대로다 — **"테이블이 남아 있다는 이유로 runtime 접근을 허용하지 않는다."**

### 3-2. 수정 — 응답을 바꾸지 않고 접근만 제거

프로덕션 `channels` 는 **0행**이므로 channel 파생값은 이미 전부 0이었다.
따라서 zero 상수로 치환하면 **응답 shape 과 값이 오늘과 완전히 동일**하다.

| 항목 | 이전 | 이후 |
|---|---|---|
| `channels` | `channelRepo.find()` 순회 결과 (실측 전부 0) | 명시적 zero 상수 |
| `opsStatus.*` | channel 순회 + heartbeat + slot 판정 (전부 0) | 명시적 0 |
| `services.*` | `channels[].serviceKey` 집합 (빈 집합) | 빈 `Set` (출처 은퇴 명시) |
| `health.*` | 위 값 기반 | 동일 계산, 동일 결과 |
| 응답 필드 | — | **하나도 제거하지 않음** (소비 UI 계약 유지) |

→ `OpsMetricsDashboard.tsx` 는 **수정 불필요**. 회귀 위험 0.

### 3-3. 회귀 가드 2건 추가

`channels-stack-retirement.spec.ts` 에 넣었다.

```text
1) admin ops-metrics 가 Channel entity 를 runtime 으로 읽지 않는다
2) routes/ · services/ · controllers/ 전 디렉터리를 재귀 스캔해
   getRepository(Channel|ChannelHeartbeat|ChannelPlaybackLog) 획득처가 0인지 확인
```

2번은 이번 결함이 **파일 단위 검색으로 새어나갔던 유형**이라 넣었다. 스윕 결과 다른 소비처는 없었다.

---

## 4. ACTIVE_DEFECT #2 — Cafe24 파일럿이 남긴 census red

`store-slug-store-id-axis.spec.ts` 는 `reserveSlug` 호출부 집합을 정적 census 로 고정한다.
Cafe24 B2B 파일럿(`6d53fd1f2`)이 **9번째 호출부**를 추가하면서 census 등재를 빠뜨려
기준 커밋 `c67a0ff1f` 에서 이 guard 가 **이미 red** 였다.

```text
누락된 호출부: services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts
```

**축 자체는 정상이다** — `storeId: organizationId` 로 organization id 축을 그대로 따른다.
따라서 파일럿 코드를 고친 것이 아니라 **census 를 실제 호출부 집합에 맞췄다**
(WO §5 허용: "잘못된 fixture·stub·테스트 전제 수정"). 8곳 → 9곳.

---

## 5. 작업공간 잔재 4건 — 은퇴 패키지 디렉터리

`main` 에서 은퇴된 패키지들의 **빌드 산출물만** 디스크에 남아 있었다.

| 패키지 | 추적 파일 | 남은 내용 | 은퇴 커밋 |
|---|:--:|---|---|
| `packages/block-core` | **0** | `dist/` · `node_modules/` | `097831c41` |
| `packages/ecommerce-core` | **0** | `dist/` · `node_modules/` · `tsconfig.tsbuildinfo` | — |
| `packages/shortcodes` | **0** | 〃 | `810097c63` |
| `packages/cosmetics-seller-extension` | **0** | 〃 | — |

**영향**: 은퇴 guard 들이 `fs.existsSync('packages/<name>')` 로 부재를 단언하는데
디렉터리가 살아 있어 **이 작업공간에서만 4건이 red** 였다(신규 CI 체크아웃에서는 green).

git 추적 0 · 소스 0 · workspace 미포함(71 projects)을 실측한 뒤 사용자 승인을 받아 제거했다.
**git 상태에는 영향이 없다**(추적 파일이 애초에 0이므로 diff 0).

---

## 6. 유지한 참조와 유지 이유

### 6-1. 분류별

| 분류 | 대상 | 유지 이유 |
|---|---|---|
| `HISTORICAL_MIGRATION` | `20270320000000-DropUsersPermissionsColumn` · `20270321000000-DropStoreEventsTable` · `20260301200000-CreateStoreEvents` | DROP 을 수행한 migration 자신. `down()` 의 재생성 SQL 도 rollback 계약이라 정상 |
| `TEST_OR_FIXTURE` | `legacy-production-schema-final-closure` · `frozen-auth-permissions-…` · `auth-runtime-and-legacy-package-…` 등 guard spec | 부재를 **검증**하는 코드. 문자열이 있어야 검사가 성립한다 |
| `DOCUMENTATION_RECORD` | `authorization.middleware.ts` · `User.ts` · `signage-role.middleware.ts` 의 은퇴 설명 주석 | "왜 없어졌는가" 추적 근거 |
| `INTENTIONAL_SCHEMA_PRESERVATION` | `channels`·`channel_heartbeats`·`channel_playback_logs` 3테이블 + entity 3 + migration 4 | 선행 WO 가 **runtime 만 은퇴, schema 는 보존**으로 확정 |
| `FALSE_POSITIVE` | `user.permissions`(프런트 런타임 필드) · `permissions:` (signage 미들웨어의 in-memory 컨텍스트) · `wp-block-core-paragraph` CSS 클래스 | **제거된 DB 컬럼과 다른 것**. 이름만 겹친다 |

### 6-2. 미제거 잔재 1건

```text
scripts/audit/shortcode-registry-report.json  (12,983 bytes, 미추적)
```

- 경위: `518252cc2` 가 생성 산출물로 확정해 tracked 해제 → 이후 `810097c63`(shortcode 도메인 은퇴)이
  생성기 `check-shortcode-registry.ts` · 전용 spec · `.gitignore` 규칙을 **함께 제거**했다.
  즉 `.gitignore` 에 없는 것은 누락이 아니라 **의도된 결과**다(생성기가 없으니 재생성되지 않는다).
- 판정: 생성기가 사라진 **stale 로컬 산출물**. 재생성 불가, 소비처 0.
- 조치: 삭제를 시도했으나 **도구 권한이 차단**되어 제거하지 못했다. 우회하지 않았다.
- 필요한 조치: 사용자가 직접 삭제하면 된다. git 추적·CI 영향은 없다(`??` 노이즈만 남는다).

> `scripts/audit/README.md` · `REGISTRY_AUDIT_REPORT.md` 는 은퇴 커밋이 이미 갱신해
> shortcode 축을 "은퇴 · 역사 기록" 으로 명시하고 있다. **dead reference 0.**

---

## 7. 보고만 하고 고치지 않은 것 (판단 필요)

### 7-1. `platform-core` 가 `build:packages` 에 없다

`apps/api-server` 는 `@o4o/platform-core/store-identity` 를 **dist 로** 소비한다
(`exports['./store-identity'] → ./dist/store-identity/index.d.ts`).
그런데 루트 `build:packages` 는 16개 패키지를 빌드하면서 `platform-core` 를 포함하지 않는다.

**결과**: 새 작업공간에서 `pnpm install` 후 곧바로 type-check 하면
`Cafe24B2bStoreProvisioningService.ts(382,9): TS2322 '"cafe24-b2b"' is not assignable to StoreSlugServiceKey`
가 난다. 소스 union 에는 `'cafe24-b2b'` 가 **이미 있으므로 코드 결함이 아니라 stale dist 다.**
`pnpm --filter @o4o/platform-core build` 로 해소된다(이번에 실행함).

**미조치 이유**: `package.json` 스크립트 변경은 CLAUDE.md 중지 조건
("`package.json` 변경 필요" · "build 인프라 변경 필요")에 해당한다. 승인 후 별도 WO 로 처리한다.

### 7-2. ops-metrics 의 `services` · `opsStatus` 는 구조적으로 항상 0

Channel 축 은퇴로 드러난 사실이다. 이 엔드포인트의 4개 블록 중 **3개가 채널 파생**이었다.

```text
services.total / active / list  ← channels[].serviceKey 집합      → 항상 0 / []
opsStatus.automated / manualAttention / contractControlled
                                ← channels 순회 + heartbeat + slot → 항상 0
channels.*                      ← channels                        → 항상 0
cms.*                           ← CmsContentSlot / CmsContent      → 유일하게 유효
```

즉 admin Ops Metrics 대시보드는 **"Services: 0"** 을 표시하고 있다(플랫폼에는 5개 이상 서비스가 있다).
은퇴 이전에도 `channels` 가 0행이었으므로 **이번 변경으로 나빠진 것은 없다.**

**미조치 이유**: 대체 출처(예: `service_memberships.service_key` · 정적 SERVICE_KEYS)를 고르는 것은
**설계 판단**이다. WO §5 "판단이 필요한 구조 변경 ... 구현하지 말고 중단하여 보고한다" 를 따랐다.
새 출처를 임의로 만들지 않았고, 코드에 `[RETIRED SOURCE]` 주석으로 명시해 두었다.

**선택지**: (a) 유효 출처를 정해 재구성 (b) 대시보드에서 해당 블록 제거 (c) 엔드포인트 은퇴.

---

## 8. 축별 판정

| 축 | 판정 |
|---|---|
| **`users.permissions`** | entity 컬럼 정의 **0** · raw SQL 접근 **0**(DROP migration 자신 제외) · 실행 코드 read **0**. guard spec 3개가 부재를 고정. **되살아나지 않음** |
| **`store_events`** | entity **없음** · 실행 코드 **0** · migration 2개(생성·DROP)와 guard spec 뿐. **되살아나지 않음** |
| **`block-core`** | 소스·workspace·lockfile **0** · `@o4o/block-core` import **0** · 잔재 디렉터리 제거 완료 |
| **`PermissionGuard`** | 실행 코드 **0**(주석·guard spec 뿐) |
| **`dist-node`** | 추적 파일 **0** · `.gitignore` 등재·tsconfig outDir 계약을 guard 가 검증하며 통과 |
| **Channel runtime** | **재활성화 0**. 이번에 마지막 소비처(ops-metrics) 제거 → repository 획득 **0** |
| **Channel schema** | **무단 변경 0**. 3테이블 · entity 3 · migration 4 전부 보존. 신규 `DROP TABLE` **0** |
| **Cafe24 B2B 파일럿** | 제거 스키마 참조 **0** · 은퇴 코드 참조 **0** · membership/credential 계약 충돌 **0** · 테스트 **47 PASS** · census 등재 보완 완료 |

---

## 9. 실행한 검증과 결과

| # | 명령 | 결과 |
|:--:|---|---|
| 1 | `git status` · `diff scope` | 수정 3파일, 범위 밖 0 |
| 2 | `pnpm install --frozen-lockfile` | **PASS** (71 projects, lockfile up to date) |
| 3 | `pnpm run build:packages` | **PASS** |
| 3-b | `pnpm --filter @o4o/platform-core build` | **PASS** (§7-1 해소용) |
| 4 | `pnpm --filter @o4o/api-server type-check` | **PASS** |
| 4-b | `pnpm --filter @o4o/admin-dashboard type-check` | **PASS** |
| 5 | **api-server 전체 Jest** | **228 suites / 3,824 tests 전부 PASS** |
| 6 | Cafe24 B2B 관련 4 suites | **47 PASS** |
| 6-b | admin-dashboard 전체 test | **13 files / 230 PASS** |
| 7 | 제거 대상 잔류 재검색 | 전 항목 **0건** (§8) |
| 8 | workspace package 해석 | **71 projects**, 은퇴 4패키지 미포함 |

### 9-1. 전체 Jest 전/후

```text
정비 전 (c67a0ff1f 기준선): 228 suites 중 3 FAIL / 3,824 tests 중 4 FAIL
정비 후                    : 228 suites PASS / 3,824 tests PASS
```

즉 **기준선 main 이 이미 red 였고**, 그 4건을 이번에 닫았다.

---

## 10. 수정한 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/admin/ops-metrics.routes.ts` | 은퇴 Channel entity import·repository·순회 2곳 제거. 응답 shape·값 불변 (+9 / −76) |
| `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts` | ops-metrics 회귀 가드 + 전역 repository 스윕 2건 추가 (+33) |
| `apps/api-server/src/__tests__/store-slug-store-id-axis.spec.ts` | Cafe24 호출부 census 등재 (8 → 9곳) (+8 / −1) |

디스크 정리(디렉터리 4개)는 미추적 산출물이라 **git diff 0**.

---

## 11. 미검증 사항

```text
1. 프로덕션 런타임 확인 미실시 — 이번 변경은 미배포다.
   단 ops-metrics 응답은 shape·값 모두 불변이라 배포 시 관측 변화가 없어야 한다.
2. web-* 서비스(kpa/gp/kcos/neture/pharmacy-hub) 개별 build 미실행 —
   이번 수정이 admin·api-server 한정이라 범위 밖으로 두었다.
3. §7-2 의 services/opsStatus 대체 출처는 판단 사항이라 설계·검증하지 않았다.
4. 프로덕션 DB 접근 0 (이번 WO 는 정적 감사·코드 정비다).
```

---

## 12. 금지선 준수

```text
제거 컬럼·테이블 복원          0
가짜 permissions 필드 재도입    0
store_events 대체 테이블        0
Channel 테이블 DROP             0
Channel runtime 재활성화        0
Cafe24 파일럿 기능 확대         0
인증·권한 체계 재설계           0
unrelated 공통화·화면 개편      0
대규모 포맷팅·줄바꿈 변환       0
다른 세션 작업 변경·삭제        0
migration 실행 / 프로덕션 DB 변경 0
force-push                      0
```

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

1. `platform-core` 를 `build:packages` 에 추가 (§7-1)
2. ops-metrics 의 `services`·`opsStatus` 유효 출처 결정 또는 블록 은퇴 (§7-2)
3. `scripts/audit/shortcode-registry-report.json` 잔재 제거 (§6-2)
