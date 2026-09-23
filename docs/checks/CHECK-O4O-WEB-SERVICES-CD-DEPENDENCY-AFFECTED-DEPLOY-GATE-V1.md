# CHECK — WO-O4O-WEB-SERVICES-CD-DEPENDENCY-AFFECTED-DEPLOY-GATE-V1

> Web Services CD 과잉 배포 정비 — `packages/** → 9개 전부 배포` 를 workspace dependency graph 기반 affected 판정으로 전환한 검증 기록.
> 대상 workflow: `.github/workflows/deploy-web-services.yml` · 판정 SSOT: `scripts/ci/detect-affected.mjs`
> 구현 commit: `682c1eea7`
> 작성일: 2026-09-23

이 문서는 WO §30 의 15항목을 그 순서대로 기록한다.

---

## §30-1. Web Service registry (9개)

`WEB_SERVICES` 는 `key ↔ 디렉터리` 매핑만 갖는다. **어떤 package 를 쓰는지는 적지 않는다** (WO §15).

| key | 디렉터리 | workspace 이름 |
|---|---|---|
| neture | `services/web-neture` | `@o4o/web-neture` |
| k-cosmetics | `services/web-k-cosmetics` | `@o4o/web-k-cosmetics` |
| kpa-society | `services/web-kpa-society` | `@o4o/web-kpa-society` |
| pharmacy-hub | `services/web-pharmacy-hub` | `pharmacy-hub-web` |
| lecture | `services/web-lecture` | `lecture-web` |
| store | `services/web-store` | `store-web` |
| kpa-branch | `services/web-kpa-branch` | `kpa-branch-web` |
| signage-player | `services/signage-player-web` | `signage-player-web` |
| hospital-pharmacy | `services/web-hospital-pharmacy` | `hospital-pharmacy-web` |

workflow output key 9개는 **이름·개수 모두 불변**이다 — downstream deploy job 의 `if:` 조건을 손대지 않았다 (WO §6).

## §30-2 · §30-3. 서비스별 직접 dependency · transitive closure

workspace 패키지 총 **68개**. 아래는 census 결과이며 코드에 하드코딩되지 않는다.

| 서비스 | direct | closure(자기 제외) |
|---|---|---|
| neture | 21 | 22 |
| k-cosmetics | 21 | 22 |
| kpa-society | 24 | 27 |
| pharmacy-hub | 18 | 18 |
| lecture | 4 | 7 |
| store | 18 | 20 |
| kpa-branch | 4 | 4 |
| signage-player | 1 | 1 |
| hospital-pharmacy | 4 | 5 |

direct < closure 인 서비스(neture · k-cosmetics · kpa-society · lecture · store · hospital-pharmacy)가 있으므로 **직접 의존만 보면 2단계 이상 package 변경을 놓친다.** `dependencyClosure()` 를 그대로 재사용했다 (WO §14). 2단계 이상에서만 등장하는 package 는 `@o4o/organization-core`(3) · `@o4o-apps/content-core`(2) · `@o4o/slide-app`(2) 이고, 테스트 W8 이 이 사실을 graph 에서 직접 뽑아 고정한다.

## §30-4. Dockerfile COPY contract census

9개 전부 **선별 COPY** 다 (`COPY packages/<pkg>/package.json` + source COPY).

| 서비스 | 선별 COPY | COPY 한 packages | closure 대비 MISSING |
|---|---|---|---|
| neture | Y | 22 | 0 |
| k-cosmetics | Y | 22 | 0 |
| kpa-society | Y | 29 | 0 |
| pharmacy-hub | Y | 18 | 0 |
| lecture | Y | 7 | 0 |
| store | Y | 20 | 0 |
| kpa-branch | Y | 4 | 0 |
| signage-player | Y | 1 | 0 |
| hospital-pharmacy | Y | 5 | 0 |

**MISSING 0** — 선언된 closure 중 Dockerfile 이 COPY 하지 않는 package 는 없다. 즉 `package.json` graph 가 Dockerfile 계약보다 좁지 않으므로 graph 판정이 false-negative 를 만들지 않는다. (kpa-society 는 closure 보다 넓게 COPY 한다 — 과잉이지 누락이 아니므로 이번 범위 밖이다.)

9개가 **전부** root 에서 COPY 하는 것: `package.json` · `pnpm-workspace.yaml` · `tsconfig.base.json` · `tsconfig.packages.json`. `pnpm-lock.yaml` 은 signage-player 만 COPY 한다.

## §30-5. undeclared workspace import census

9개 서비스 `src/**` 전수에서 실제 `@o4o/*` · `@o4o-apps/*` import 를 추출해 선언된 closure 와 대조했다.

- **UNDECLARED_USED: 9개 서비스 전부 0건** — drift 없음.
- DECLARED_UNUSED: neture 3 · k-cosmetics 3 · kpa-society 3 · store 2 · kpa-branch 1 · signage-player 1 · 나머지 0. (과잉 선언이므로 판정을 넓힐 뿐 놓치지 않는다. 정리는 이번 범위 밖.)

이 대조는 일회성 census 로 끝내지 않고 **contract test 로 고정**했다 (WO §23) — `§23. 9개 서비스의 실제 @o4o import 는 전부 선언된 dependency closure 안에 있다`.

## §30-6. 기존 `packages/** → 전부` 구조

교체 전 `detect-changes` 잡의 판정부:

```bash
if [ "$FORCE_ALL" = "1" ] || echo "$CHANGED_FILES" | grep -q "^packages/"; then
  echo "decision: shared packages changed or forced — rebuilding all web services"
  echo "neture=true" >> $GITHUB_OUTPUT
  ...  # 9개 전부
  exit 0
fi
```

이 블록을 제거하고 `node scripts/ci/detect-affected.mjs` 호출로 교체했다. `decide()` 헬퍼(서비스 디렉터리 prefix 매칭)도 함께 제거됐다 — 같은 판정을 detector 가 한다.

## §30-7. 최근 과잉 배포 실측

`deploy-web-services.yml` 최근 push run 중 on.push.paths 로 실제 트리거되는 **56건**을 재판정했다.

| 항목 | 기존 정책 | 신규 판정 |
|---|---|---|
| deploy job 판정 합계 | 256 | 224 |
| 제거된 job | — | **32개 (12.5%)** |
| 9개 전부 배포 run | **24건** | **7건** (전부 §19 fallback) |

서비스별 deploy job 실측 평균: hospital-pharmacy 1.89분 · k-cosmetics 2.31 · kpa-branch 1.73 · kpa-society 2.45 · lecture 1.98 · neture 2.34 · pharmacy-hub 2.17 · signage-player 1.84 · store 1.99 — **전체 평균 2.08분**. 제거된 32 job ≈ **66.5 runner-분**.

> **측정 기준 주의.** 처음에는 "과거 run 에서 실제로 실행된 deploy job 수" 를 before 로 잡았는데, `deploy-lecture` · `deploy-store` · `deploy-hospital-pharmacy` 세 잡이 나중에 추가된 탓에 오래된 run 에는 애초에 6개만 있었다. 그 숫자로 비교하면 before 216 → after 225 로 **늘어난 것처럼** 보인다. 실제로 교체되는 것은 정책이므로, 위 표는 **동일한 현행 9서비스 workflow 기준으로 기존 규칙을 재현한 판정 vs 신규 판정** 이다.

대표적인 절감 run: `35295700837`(ai-core, 9→0) · `35298072375`(9→0) · `34981051272`(9→0) · `35353030253`(9→5) · `35344154190`(9→6). 반대로 `auth-client` 계열 변경은 9→8 로 거의 줄지 않는다 — 실제로 8개 서비스가 소비하기 때문이고, 이것이 graph 판정의 정직한 결과다.

## §30-8. 대표 baseline — `hospital-pharmacy-core`

- before: `packages/hospital-pharmacy-core/**` 변경 → **9개 전부 배포**. 그중 8개는 이 package 를 closure 안에 갖고 있지도 않다 (consumer = hospital-pharmacy 1개).
- after: **1개 배포 / 8개 skipped**.
- 절감: 불필요 job 8개 ≈ **16.6 runner-분**, 불필요 Docker push 8, 불필요 Cloud Run revision 8.
- 실제 Actions 로 확인함 — Scenario A(`35812501896`).

## §30-9. Web consumer 0 package 결과

`packages/` 아래 **55개** 중 **26개가 어떤 Web 서비스의 closure 에도 없다.** consumer 수 분포: 0명 26 · 1명 2 · 2명 3 · 3명 6 · 4명 6 · 5명 5 · 6명 2 · 7명 1 · 8명 4. **9명(전 서비스)인 package 는 0개다** — 즉 "packages 변경 → 9개 전부" 가 맞는 경우는 실제로 한 건도 없었다.

consumer 0 에 해당하는 대표: `@o4o/ai-core` · `@o4o/action-log-core` · `@o4o/api-types` · `@o4o-apps/cms-core` · `@o4o-apps/digital-signage-core` · `@o4o-extensions/organization-forum` 등. 이들 변경 시 Web deploy 는 0 이다 (Scenario C 로 실증).

allowlist/denylist 는 코드 어디에도 없다 (WO §10) — 위 숫자는 전부 graph 에서 계산된다.

## §30-10. detector test 결과

`node --test scripts/ci/__tests__/detect-affected.test.mjs` → **54/54 PASS · fail 0**.

- 기존 41개 전부 유지 (Admin · Docs · API CD 축) — WO §22 요구.
- 신규 13개: W1(서비스 자체) · W2(hospital-pharmacy-core) · W3(store-ui-core) · W4(auth-client) · W5(consumer 0) · W6(서비스+package 합집합) · W7(복수 서비스) · W8(transitive 2단계) · W9(매핑 불가·root build 입력 → 전부 true, 중립 경로 → 0) · W10(multi-commit push) · W11(base SHA 이상 → 전부 true) · W12·W13(workflow 계약: dispatch all/단일 · §17 trigger · §21 summary) · §23(import ⊆ closure contract).

기대값을 테스트에 적지 않고 `consumersOf(pkg)` 로 graph 에서 받아와 비교한다 — 목록을 하드코딩하면 그 목록이 두 번째 정본이 되기 때문이다.

## §30-11. 실제 Actions run ID (§24 Scenario A~E)

| 시나리오 | 입력 | run ID | 실행 | skipped | 결과 |
|---|---|---|---|---|---|
| — (§16 workflow 자체 변경) | push `682c1eea7` | `35812263193` | 9 | 0 | success — 의도된 전 서비스 배포 |
| A | `400284f8a` (hospital-pharmacy-core + lockfile) | `35812501896` | `deploy-hospital-pharmacy` | 8 | **PASS** |
| B | `3a41a04fe` (store-ui-core) | `35812880748` | neture · k-cosmetics · kpa-society · pharmacy-hub · store | 4 (lecture · kpa-branch · signage-player · hospital-pharmacy) | **PASS** |
| C | `acb449b4c` (ai-core = Web consumer 0) | `35813129237` | **0** | 9 | **PASS** |
| D | `7874ab281` (services/web-neture 만) | `35813235481` | `deploy-neture` | 8 | **PASS** |
| E | `d8edbf95a` (혼합 union) | `35813493919` | neture · k-cosmetics · kpa-society · pharmacy-hub · lecture · store | 3 | **PASS** |
| §20 dispatch 단일 | `service=signage-player` | `35813769772` | `deploy-signage-player` | 8 | **PASS** |

Scenario A 는 lockfile 을 포함하는데도 hospital-pharmacy 1개로 좁혀졌다 — lockfile 을 서비스별 importer 단위로 보기 때문이다 (WO §17).

판정 재현 입력(`base_sha`/`head_sha`)은 API CD gate 의 선례를 그대로 따랐다. 이 입력을 비우면 기존 수동 배포 동작(`service=all` · 개별 서비스)이 그대로다 (WO §20).

> `service=all` 라이브 실행은 별도로 돌리지 않았다 — 같은 코드 경로를 §16 push run(`35812263193`)이 9개 전부 배포로 실증했고, W12 계약 테스트가 dispatch all 분기를 고정한다. 9개 재배포를 한 번 더 만드는 비용이 추가 검증 가치보다 크다고 판단했다.

## §30-12. Docker / Cloud Run skipped 증거 (§25)

`affected=false` 인 잡은 **step 이 0개** 다 — 즉 Docker build·push 도, `gcloud run deploy` 도 실행되지 않는다. Scenario C(`35813129237`) 전수:

```
deploy-pharmacy-hub      conclusion=skipped steps=0
deploy-kpa-branch        conclusion=skipped steps=0
deploy-hospital-pharmacy conclusion=skipped steps=0
deploy-signage-player    conclusion=skipped steps=0
deploy-k-cosmetics       conclusion=skipped steps=0
deploy-store             conclusion=skipped steps=0
deploy-neture            conclusion=skipped steps=0
deploy-lecture           conclusion=skipped steps=0
deploy-kpa-society       conclusion=skipped steps=0
```

대조로 Scenario A 에서 **실행된** 잡(`deploy-hospital-pharmacy`)의 step: Checkout → Authenticate to Google Cloud → Set up Cloud SDK → Configure Docker for GCR → **Build and push Docker image** → **Deploy to Cloud Run** → Verify deployment (전부 success). 같은 run 의 `deploy-neture` 는 `steps=0 conclusion=skipped`.

workflow 전체 success 만 보고 판단하지 않았고, 잡별 `conclusion` 과 step 수를 확인했다.

## §30-13. fallback 규칙 (§19)

아래는 전부 **9개 서비스 true** 다. false negative 대신 과잉 배포 1회를 택한다.

| 조건 | 처리 |
|---|---|
| base SHA 없음 / all-zero / git diff 실패 | detector 가 `web_deploy` 전부 true (`safe fallback — …`) |
| 변경 파일 0건 | 전부 true |
| workspace graph 에서 서비스 manifest 를 못 찾음 | 전부 true |
| workspace 매핑 불가 경로 (`unknown-root-thing/x.ts` 등) | 전부 true |
| root build 입력 (`package.json` · `pnpm-workspace.yaml` · `tsconfig.base.json` · `tsconfig.packages.json` · `.npmrc` · `.dockerignore`) | 전부 true |
| `pnpm-lock.yaml` 판정 예외 | 전부 true |
| `deploy-web-services.yml` 자체 변경 (§16) | 전부 true — 판정을 고치고도 아무것도 안 돌아 검증 불가한 구조를 피한다 |

반대로 **무영향**으로 두는 것: `pnpm-lock.yaml` 중 해당 서비스 importer 를 건드리지 않은 변경 · `.github/` · `scripts/` · `tools/` · `e2e/` · `.husky/` · `docs/` · root 최상위 `*.md`(README · AGENTS.md · CLAUDE.md).

## §30-14. multi-commit push 검증 (§18)

`github.event.before .. github.sha` 배치 diff 를 그대로 유지했다 (`fetch-depth: 0` 포함). HEAD~1 회귀는 없다 — `event.before` 가 못 쓸 때(신규 브랜치 · force push)에만 HEAD~1 로 내려가고, 그것마저 없으면 detector 의 safe fallback 이 받는다.

테스트 W10 이 실제 git 저장소를 만들어 고정한다: `packages/hospital-pharmacy-core` 변경 commit → docs-only commit 순으로 push 하면 **마지막 commit 만 보면 배포가 0 으로 사라지고**, 배치 전체를 보면 `hospital-pharmacy` 가 잡힌다.

라이브 확인: run `35812263193` 로그에 `base_sha=b3cff7952… head_sha=682c1eea7…` 가 찍혀 배치 범위가 그대로 쓰였다.

## §30-15. 기존 Admin / Docs / API affected logic 비회귀

- `classifyWebDeploy()` 는 **독립 축** 으로 추가됐다. `classify()` 의 기존 반환 필드(`admin_affected` · `admin_only` · `api_affected` · `api_ci_affected` · `api_deploy_affected` · `docs_only` · `docs_fast_eligible`)의 계산에 손대지 않았고, `web_deploy` 키만 늘었다.
- 기존 테스트 41개 전부 그대로 PASS (Case 1~8 · D1~D10 · A~K · workflow 계약).
- `deploy-api.yml` · `ci-pipeline.yml` · `ci-security.yml` 은 이번 commit 에서 변경하지 않았다.
- 새 독립 detector 를 만들지 않았다 (WO §2) — `buildWorkspaceGraph` · `dependencyClosure` · `workspaceDirOf` · `parsePnpmLock` · `lockfileDeployImpact` 을 재사용한다.

---

## 변경 파일

| 파일 | 내용 |
|---|---|
| `scripts/ci/detect-affected.mjs` | `WEB_SERVICES` registry · `webServiceClosures()` · `classifyWebDeploy()` 추가, `classify()` 에 `web_deploy` 축 배선, CLI 출력 · `GITHUB_OUTPUT` 에 서비스 9개 key 추가, `!read.ok` fallback 에 전 서비스 true |
| `.github/workflows/deploy-web-services.yml` | `packages/**→all` 블록 · `decide()` 제거 → detector 소비. §17 root build 입력 trigger 추가. §21 summary `needs`·출력 보정. §24 판정 재현 입력(`base_sha`/`head_sha`) 추가 |
| `scripts/ci/__tests__/detect-affected.test.mjs` | W1~W13 · §23 contract test 추가 (41 → 54) |

## 불변 확인

- output key 9개 이름·개수 불변 · deploy job 9개의 `if:` 조건 불변 (WO §6)
- `workflow_dispatch` 의 `service=all` · 개별 서비스 배포 동작 불변 (WO §20)
- `concurrency: deploy-web-${github.ref}` · `cancel-in-progress: false` 불변
- 각 서비스의 build-arg · env 주입 불변 — 배포 정책 자체는 바꾸지 않았다 (WO §21 단서)
- WO §28 범위 밖(Docker layer cache · Cloud Build · Artifact Registry · Dockerfile 통합 · Web 기능 · API deploy gate · Docs/Admin CI) 미접촉
- WO §29: `service-membership-ensure` · `OperatorInvitation` · `CreateOperatorInvitations` migration 등 타 세션 소유 파일 미접촉

## 남은 관찰 (별도 판단 대상 · 이번 범위 밖)

1. `kpa-society` Dockerfile 이 closure(27) 보다 넓게 COPY(29) 한다 — 누락이 아니라 과잉이라 판정에는 영향이 없다.
2. DECLARED_UNUSED 13건(neture 3 · k-cosmetics 3 · kpa-society 3 · store 2 · kpa-branch 1 · signage-player 1) — 판정을 넓힐 뿐이나 정리하면 절감폭이 커진다.
3. `auth-client` · `auth-react` · `auth-utils` · `types` 는 8/9 서비스가 소비한다 — 이 축의 변경은 구조상 거의 전 서비스 배포다. 더 줄이려면 package 분할이 필요하고 이는 CD 정비가 아니라 구조 변경이다.

---

*Status: COMPLETE*
*WO: WO-O4O-WEB-SERVICES-CD-DEPENDENCY-AFFECTED-DEPLOY-GATE-V1*
