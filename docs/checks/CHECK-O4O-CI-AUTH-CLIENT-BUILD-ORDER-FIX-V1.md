# CHECK-O4O-CI-AUTH-CLIENT-BUILD-ORDER-FIX-V1

> WO: `WO-O4O-CI-AUTH-CLIENT-BUILD-ORDER-FIX-V1`
> 목표: CI Pipeline 의 admin-dashboard Vitest 가 `@o4o/auth-client` dist 부재로 실패하는 문제 수정.
> 애플리케이션 기능 변경 없음 / 패키지 버전·DB·migration 변경 없음 / 전체 패키지 무차별 build 없음.

---

## 1. 결론 — WO 전제(빌드 순서)는 원인이 아니었다

`ci-pipeline.yml` 의 빌드 순서는 **이미 올바르다.** `setup-build-env` 가 `pnpm run build:packages`
(= `build:auth-client` 포함) 를 테스트 단계보다 먼저 실행하고, `packages/auth-client/dist` 도 CI 에서 정상 생성된다.
(근거: Build 잡의 `Verify package builds` 가 `test -d packages/auth-client/dist` 를 통과해 왔다.)

실제 원인은 **node_modules 쪽 사본이 stale** 한 것이다. 따라서 빌드 순서를 조정해도 고쳐지지 않는다.

## 2. 원인

`pnpm` 은 워크스페이스 패키지라도 **`file:` 프로토콜로 선언되면 심링크가 아니라 물리 복사본**으로 설치한다
(peer 접미사가 붙어 `version: file:packages/auth-client(react@19.2.0)` 형태로 실체화).

```
install (dist 없음)  →  사본 생성 = src/ + package.json 만
        ↓
build:packages       →  packages/auth-client/dist 생성
        ↓
test                 →  사본을 해석 → dist/index.js 없음 → 실패
```

- `package.json` 의 `exports["."].import = ./dist/index.js` 를 Vite 가 못 찾아
  `Failed to resolve entry for package "@o4o/auth-client"` 로 collect 실패.
- 같은 이유로 `type-check:frontend` 에서 `auth-context` 가 TS2307 을 냈다. `scripts/dev.mjs` 가 종료코드를
  삼켜 **비차단으로 방치**되어 있었다.
- **로컬에서 재현되지 않은 이유**: 로컬은 install 시점에 이미 `dist` 가 있어 사본에 포함된다.

### 2-1. 이미 존재하던 우회 (원인 확증)

`scripts/ci-build-app.sh` 는 `build:packages` **직후 `pnpm install` 을 다시 실행**한다.

```bash
pnpm run build:packages
...
echo "🔗 Reinstalling to pick up updated package.json..."
pnpm install
```

재설치가 사본을 dist 포함 상태로 다시 만든다. **Build 잡은 통과하고 Code Quality Check 잡(재설치 없음)만
실패**해 온 이유가 이것이며, 원인 진단의 독립 확증이다.

### 2-2. 왜 지금 드러났나

`dist` 부재는 오래된 조건이다 — 마지막 GREEN 런(2026-08-01, `74daa3488`)에도 동일한 TS2307 이 찍혀 있다.
`6ae8ccd29`(타 트랙, 2026-08-03)가 추가한 `membership-category-*` 테스트가 **이 해석 경로를 처음 임포트**하면서
가려져 있던 결함이 표면화됐다. `6f70a21b5` 로 앞선 api-server Jest 실패가 해소되어 job(`-e`)이
admin-dashboard 단계까지 진행한 것도 같은 시점에 겹쳤다.

## 3. 수정 — 소비처 선언을 워크스페이스 규약으로 수렴

`@o4o/auth-client` 소비처 14곳 중 **12곳이 이미 `workspace:*`**, 2곳만 `file:` 이었다. 그 outlier 를 정정했다.

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/package.json` | `@o4o/auth-client` · `@o4o/auth-context` : `file:../../packages/*` → `workspace:*` |
| `packages/auth-context/package.json` | `@o4o/auth-client` · `@o4o/types` : `file:../*` → `workspace:*` |
| `pnpm-lock.yaml` | 재생성 (specifier 4개 + auth-client 실체화 항목 제거) |

- **버전 변경 없음** — 동일한 로컬 워크스페이스 패키지를 가리키는 프로토콜만 바꿨다.
- `ci-pipeline.yml` **무변경** — 순서가 원인이 아니므로 손대지 않았다.
- 애플리케이션 소스 무변경.

### 3-1. 연쇄 확산 여부 (WO 중지 조건 점검)

WO 는 "auth-client 외 여러 dist 패키지가 연쇄적으로 누락되면 중지" 를 걸었다. 실체화 집합을 단계별로 실측했다.

| 단계 | `file:` 로 실체화되는 `@o4o/*` 패키지 | 비고 |
|------|--------------------------------------|------|
| 기준선 | 7 — auth-client, block-renderer, forum-core, operator-ux-core, pharmacy-ai-insight, shortcodes, utils | |
| auth-client 만 정정 | 7 — **auth-client 빠지고 auth-context 진입** | 문제 이동. 채택하지 않음 |
| + auth-context 소비 선언 정정 | **6 — auth-client·auth-context 둘 다 이탈, 신규 진입 0** | 채택 |

즉 연쇄 확산이 아니라 **순감(7→6)** 이며 중지 조건에 해당하지 않는다.

**잔존 6개**(block-renderer / forum-core / operator-ux-core / pharmacy-ai-insight / shortcodes / utils)는
동일한 잠재 결함을 그대로 갖고 있으나 현재 실패 원인이 아니므로 손대지 않았다 — §6 후속.

## 4. 검증

### 4-1. 로컬

| 항목 | 결과 |
|------|------|
| `apps/admin-dashboard/node_modules/@o4o/auth-client` | **COPY → Junction** (`packages/auth-client` 로 심링크) |
| 〃 `@o4o/auth-context` | **COPY → Junction** |
| admin-dashboard Vitest | **10 files / 182 tests 전부 PASS** — 실패했던 3개 스위트 collect 성공 |

> 사용자 지시는 "lockfile 만 커밋, 검증은 CI" 였으나, `package.json` 변경을 감지한 **pre-commit 훅이 전체
> `pnpm install` 을 자동 실행**했다. 의도한 `--lockfile-only` 범위를 넘은 부수효과이며, 그 결과 위 로컬 검증이
> 가능해졌다. 훅 동작이므로 별도 되돌림은 하지 않았다.

### 4-2. CI (run `30810657209`, commit `e250eb0bb`)

| 단계 | 결과 |
|------|------|
| Code Quality Check | **success** |
| api-server Jest | **72 suites / 1331 tests passed** — pharmacy-hub 유지 |
| admin-dashboard Vitest | **10 files passed** (직전 7 passed / 3 failed) |
| api-gateway Vitest / multi-tenant Vitest | 1 / 4 passed |
| Build Applications (admin-dashboard, main-site) | **success** |
| 잔존 `TS2307 Cannot find module '@o4o/auth-client'` | **0건** (직전 3건) |

**CI Pipeline 전체 success — 2026-08-01 이후 첫 GREEN.**

### 4-3. 배포 workflow 회귀

- `Build Applications` 잡이 `scripts/ci-build-app.sh`(deploy 계열과 동일한 install→build 경로)를
  admin-dashboard·main-site 양쪽으로 통과.
- `services/web-*` 5개와 `apps/api-server` 는 이미 `workspace:*` 라 해석 위상 변화 없음.
- `deploy-admin.yml` 은 `setup-build-env` 후 **재설치 없이** vite 빌드한다. 즉 수정 전에는 이 경로도 stale 사본을
  쥐고 있었고, 이번 변경으로 심링크가 되어 **오히려 잠재 위험이 제거**됐다. (프로덕션 배포는 본 WO 범위 밖이라
  트리거하지 않음.)

## 5. 커밋

| 커밋 | 내용 |
|------|------|
| `e250eb0bb` | `fix(ci): declare auth-client/auth-context as workspace deps so dist is never stale` |

- push: `main` (`42b1c2077..e250eb0bb`)
- 병렬 세션 작업물(`otc-zh-*`, `hff-zh-b02-*`) 미접촉 — 3개 파일만 path-specific stage.

## 6. 후속

- **잔존 `file:` 실체화 6개** — block-renderer / forum-core / operator-ux-core / pharmacy-ai-insight /
  shortcodes / utils. 동일 결함을 갖지만 현재 `ci-build-app.sh` 의 재설치가 Build 경로를 가려주고 있다.
  `deploy-admin.yml` 처럼 재설치 없는 경로에서는 위험이 남는다. 별도 WO 로 동일 수렴 권장.
- **`scripts/dev.mjs` 의 종료코드 삼킴** — `type-check:frontend` 의 TS2307 이 8/1 GREEN 런에서도 무시되고 있었다.
  타입 오류가 CI 를 통과하는 구조이므로 별도 판단 필요.
- `apps/api-server/packages/*` 의 vendored 사본(`auth-context` 등)도 `file:` 선언을 쓰지만
  pnpm 워크스페이스 멤버가 아니므로 본 변경과 무관 — 범위 밖.
