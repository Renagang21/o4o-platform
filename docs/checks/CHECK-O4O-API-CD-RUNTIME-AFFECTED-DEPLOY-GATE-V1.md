# CHECK — WO-O4O-API-CD-RUNTIME-AFFECTED-DEPLOY-GATE-V1

> **대상**: `Deploy API Server (Cloud Run)` 과잉 배포 정비
> **구현 commit**: `da8767b57`
> **작성일**: 2026-09-23
> **상태**: 구현 · 판정 검증 완료 / §22-11(실 runtime deploy green)은 **무관한 main 빌드 실패로 BLOCKED**

Admin(`deploy-admin.yml`) · Docs(`ci-pipeline.yml` · `ci-security.yml`) 에 이어 **세 번째 affected-scope 적용**이다.
새 detector 를 만들지 않고 공용 SSOT `scripts/ci/detect-affected.mjs` 를 확장했다.

---

## 1. 최근 API deploy census

`gh run list --workflow=deploy-api.yml --limit 60` 기준, **성공 58건 / 총 490.9분**.
각 run 의 `headSha^1..headSha` 변경 집합을 **이번에 구현한 detector 로 재판정**했다.

| 구분 | 건수 | 시간 |
|---|---|---|
| 성공 배포 | 58 | 490.9분 |
| 신규 판정 `api_deploy_affected=false` (= 과잉) | **17 (29.3%)** | **149.4분** |
| 판정 오류(ERR) | **0** | — |

> WO §3 의 기준선(44회 / 42성공 / 14회 / 356.6분 / 119분, 33.3%) 과 수치가 다르다.
> 관측 창이 다르고(최근 60건 재수집), 본 재판정은 run 당 `^1..head` **단일 commit 근사**를 썼기 때문이다.
> 방향(약 1/3 이 과잉)과 결론은 동일하다. 근사라는 점을 숨기지 않고 기록한다.

## 2. 과잉 배포 횟수 · 시간

**17건 / 149.4분** (성공 배포 시간의 30.4%). 이 시간은 Actions 시간이 아니라
**production 작업**(Docker image push · Cloud Run migration Job 실행 · 새 revision · one-off job image 재고정)이 실제로 수행된 시간이다.

## 3. 실제 과잉 대표 run 의 migration/deploy step 증거

대표: **run `35694403799`** (head `5f463c95d` — frontend/service 변경 + `pnpm-lock.yaml`, API runtime 무변경)
`success` · 2026-09-22T06:20:39Z → 06:27:12Z (**6분 33초**)

전체 step 이 `success` 로 실행됐다:

```
Build API server (bundled with tsup)            success
Build and Push Docker image                     success
Run database migrations                         success   ← production DB 작업
Deploy to Cloud Run                             success   ← 새 revision 생성
Refresh one-off Cloud Run job image references  success
Verify deployment                               success
```

즉 **API runtime 이 한 줄도 바뀌지 않은 변경에서 production migration Job 과 Cloud Run revision 이 실제로 실행**됐다.
이 run 은 신규 판정에서 `api_deploy_affected=false` 다 (§18 시나리오 5 로 실측 재현, 아래 8·10 참조).

## 4. API runtime / test 경계 (§6 census)

추측으로 제외하지 않고 **build entrypoint 와 결과물**을 census 해서 정했다.

production image 구성:
- `tsconfig.build.json` 의 `tsc` → `dist/database` (decorator 필요한 migration 축)
- `tsup.config.ts` **9 entry** → `dist/main.js` · `dist/migrate.js` + one-off job 7종
- `Dockerfile` 이 추가로 복사: `src/assets` → `dist/assets`, `mail-templates` → `templates/email`

deploy 무영향으로 판정하는 경로(`isApiNonDeployPath`):

```
apps/api-server/tests/**
(^|/)__tests__/          (^|/)__mocks__/
*.spec.{ts,tsx,js,mjs,cjs}   *.test.{...}
(^|/)jest.config.*
```

근거 3가지 — 전부 실제 확인:
1. `tsconfig.build.json` 이 위 경로를 `exclude` 한다 → `dist` 에 들어가지 않는다.
2. production source → `__tests__/` · `tests/` **import 0건**.
3. **raw text 로 읽는 특수 사례 census**(§6 요구): 저장소 전체 `readFileSync` 중 test 경로를 읽는 것은 **2건뿐이고 둘 다 `src/scripts/**`** (배포 이미지 진입점 아님). 즉 "test 파일이 런타임에 텍스트로 읽히는" 경로는 없다.

## 5. API workspace dependency closure (§7)

하드코딩 목록을 만들지 않았다. `buildWorkspaceGraph()` 가 읽은 workspace graph 에서
`dependencyClosure(graph, '@o4o/api-server')` 로 **transitive closure 를 계산**한다.

- closure: **29** (api-server + package 28)
- closure 밖 package: **27** — `auth-react` · `store-ui-core` · `shared-space-ui` · `ui` · `operator-core` · `hospital-pharmacy-core` 등

closure 밖 package 변경 → `api_deploy_affected=false`. 회귀 테스트 `0-D` 가 "하드코딩이 아니라 graph 산출"임을 강제한다.

## 6. lockfile 판정 정책 (§9)

`pnpm-lock.yaml` 은 무조건 true 도, 무조건 ignore 도 아니다. **importer 단위 정밀 비교**를 한다.

- `parsePnpmLock(text)` → `{ importers: Map<dir, block>, tail }`
- `apiDeployImporters(graph, closure)` → `'.'` + closure package 각 dir
- `lockfileDeployImpact(base, head, deployImporters)`:
  - parse 실패 → **true** (fallback)
  - `importers:` 밖(tail = `packages:`/`snapshots:`/`overrides:` 등) 변경 → **true**
  - 변경된 importer 가 deploy importer 집합과 교집합 → **true**
  - 그 외(무관 importer 만 변경) → **false**

실제 lockfile 변경 run 4건으로 검증: **3건 false · 1건 true** — 모두 옳은 판정.

## 7. safe fallback (§16)

다음은 예외 없이 `api_deploy_affected=true` 다.

- base SHA 없음 / all-zero(최초 push) / force push 로 base 조회 불가
- `git diff` 실패, workspace graph 구성 실패
- lockfile 원문 확보 실패 · parse 실패 (`readLock` 미공급 포함 → `--files-from` 재현 모드도 true)
- 알 수 없는 root build config, graph 에 매핑되지 않는 경로
- detector exception

즉 **false negative 를 만들지 않는다**. 불필요한 배포 한 번을 택한다.

## 8. detector test 결과 (§17 A~K)

```
node --test scripts/ci/__tests__/detect-affected.test.mjs
→ 41/41 PASS
```

기존 Admin·Docs 회귀 **26건 전부 유지** + 신규 15건. 케이스 대응:

| 케이스 | 내용 |
|---|---|
| 0-D | closure 는 graph 산출(하드코딩 금지) |
| A | api-server runtime source → true |
| B | api-server test-only → ci true / deploy false |
| C | 실 경로 확인 — helper/test 는 비배포, `src/assets` · `Dockerfile` · `tsup.config.ts` · `package.production.json` 은 배포 |
| D | closure package → true |
| E | closure 밖 frontend package → false |
| F | `services/admin-dashboard` → false |
| G | `migrations/**` · `bootstrap/**` · `incremental/**` · `migration-config` · `migrate.ts` → true (§14) |
| H | 혼합 변경 → true 우선 |
| I | lockfile 합성 fixture 6종(무관 importer false / api importer true / tail true / parse 실패 true / readLock 없음 true / 정상 false) |
| I-2 | root manifest true · `deploy-api.yml` true · `.github/actions/**` true · `deploy-web-services.yml` false · `scripts/ci/detect-affected.mjs` false · docs 삭제 false |
| J | 실제 git multi-commit — 마지막 commit 만 보면 false, 배치 전체는 true |
| K | 빈 변경 · 미매핑 경로 → fallback true |
| §11 / §13·§15 | workflow YAML 계약(detect 잡 존재 · heavy step 이 전부 `build-and-deploy` 안 · dispatch 재현 입력) |

실 commit 판정 spot check: `5f463c95d` · `400284f8a` · `2744ea809` · `09dfc1d00` · `082f5887f` → false / `7a64d8739` → true. 전부 기대와 일치.

## 9~12. 실제 Actions 검증 (§18)

`base_sha`/`head_sha` 를 준 수동 실행은 **판정 재현 전용**이다(§15) — `force_deploy` 없이는 production 을 건드리지 않는다.
따라서 replay run 의 `build-and-deploy` 는 `skipped` 이고, **판정값이 검증 대상**이다.

| # | 시나리오 | run | head | `api_ci_affected` | `api_deploy_affected` | `build-and-deploy` |
|---|---|---|---|---|---|---|
| 1 | API test-only | `35805606157` | `d52c836d8` | true | **false** | skipped |
| 2 | API runtime source (실 push) | `35805158444` | `da8767b57` | true | **true** | **failure — 아래 참조** |
| 3 | API closure package | `35805686244` | `7a64d8739` | true | **true** | skipped(재현 모드) |
| 4 | closure 밖 frontend package | `35805724684` | `09dfc1d00` | false | **false** | skipped |
| 5 | frontend/service + `pnpm-lock.yaml` 실사례 | `35805780997` | `5f463c95d` | true | **false** | skipped |

- **§22-9 (API test-only 실 deploy skip)** — PASS. run `35805606157`.
- **§22-10 (closure 밖 package 실 deploy skip)** — PASS. run `35805724684` · `35805780997`.
- **§22-12 (migration 0회 증거)** — PASS. `build-and-deploy` 가 `skipped` 이면 그 잡 안의
  `Build and Push Docker image` · `Run database migrations` · `Deploy to Cloud Run` ·
  `Refresh one-off Cloud Run job image references` 가 **한 건도 생성되지 않는다**.
  위 4개 replay run 의 job 목록에 `build-and-deploy` step 이 존재하지 않는 것으로 확인했다.
  §13 불변식(false → migration 0 · Cloud Run deploy 0 · one-off job 갱신 0) 충족.

### §22-11 (실제 API runtime deploy green) — **BLOCKED (본 WO 무관)**

`da8767b57` push 는 `deploy-api.yml` 을 건드리므로 `api_deploy_affected=true` 로 판정됐고,
`detect` 잡 success → `build-and-deploy` 가 **정상적으로 full path 에 진입**했다.
그러나 `Build API server (bundled with tsup)` 의 `tsc` 단계에서 실패했다:

```
src/controllers/admin/AdminUserController.ts(150,8): TS2307
  Cannot find module '../../services/admin/service-membership-ensure.js'
src/database/entities.ts(31,36): TS2307
  Cannot find module '../entities/OperatorInvitation.js'
src/database/incremental/manifest.ts(34,56): TS2307
  Cannot find module '../migrations/1790125106065-CreateOperatorInvitations.ts'
```

원인은 **다른 세션의 선행 commit `8d8a3a874`** 가 위 3개 파일을 *참조하는* 쪽만 push 하고
참조 *대상* 파일(`OperatorInvitation.ts` · `service-membership-ensure.ts` ·
`1790125106065-CreateOperatorInvitations.ts`, WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1)
은 아직 push 하지 않은 데 있다. 세 파일 모두 `origin/main` 에 존재하지 않는다.

- 본 WO 변경(detector · test · workflow gate)과 **인과가 없다**. 실패 지점이 detect 가 아니라 API source 컴파일이다.
- 오히려 **게이트가 true 로 올바르게 판정하고 full path 로 들어갔다**는 증거다 — §13 반대 방향의 정상 동작 확인.
- CLAUDE.md 중지 조건 "현재 변경과 무관한 build · test 실패" 에 해당하고, 미추적 파일은 다른 세션 소유(불가침)이므로 **고치지 않고 보고**한다.
- **후속**: 해당 세션이 누락 파일을 push 한 뒤 `deploy-api.yml` 를 한 번 실행하면 §22-11 은 그대로 충족된다.
  게이트 코드 변경 없이 재실행만 필요하다.

## 13. 기존 Admin/Docs affected path 비회귀

- 기존 test 26건 전부 유지 · PASS (삭제 · 완화 0).
- `classify()` 의 기존 출력 key(`admin_affected` · `api_affected` · `docs_only` · `specs` 등) 불변.
  `api_ci_affected` · `api_deploy_affected` **2개만 추가**했다.
- `ci-pipeline.yml` · `ci-security.yml` · `deploy-admin.yml` 은 **수정하지 않았다**.

---

## 변경 파일

| 파일 | 내용 |
|---|---|
| [`scripts/ci/detect-affected.mjs`](../../scripts/ci/detect-affected.mjs) | `isApiNonDeployPath` · `parsePnpmLock` · `apiDeployImporters` · `lockfileDeployImpact` · `classifyApiDeploy` 추가, CLI 에 `readLock` 공급 + 출력 2종 |
| [`scripts/ci/__tests__/detect-affected.test.mjs`](../../scripts/ci/__tests__/detect-affected.test.mjs) | 41 tests (기존 26 + 신규 15) |
| [`.github/workflows/deploy-api.yml`](../../.github/workflows/deploy-api.yml) | `detect` 잡 추가 · `build-and-deploy` 게이트 · `base_sha`/`head_sha` 재현 입력 |

## 불변으로 둔 것 (§20 · §21)

- `build-and-deploy` **안의 step 은 한 줄도 수정하지 않았다** — migration 선행 → Cloud Run deploy, DB readiness, LB-only ingress, Docker image contract, one-off job image 재고정, health/ready 검증 전부 그대로.
- `on.push.paths` 를 좁히지 않았다(§12) — 넓은 trigger → 가벼운 detect → heavy deploy 조건부.
- 범위 밖(§21): Jest affected 최적화 · Docker layer/cache · `--no-cache` 정책 · migration architecture · one-off job 구조 · `deploy-web-services.yml` — 전부 미착수.

## 남은 것

1. **§22-11 재실행** — 다른 세션의 누락 파일 push 후 API runtime deploy 1회 green 확인.
2. 다음 WO — `deploy-web-services.yml` 의 `packages/** → 9개 웹서비스 전부 재배포` 정비 (지시 대기).
