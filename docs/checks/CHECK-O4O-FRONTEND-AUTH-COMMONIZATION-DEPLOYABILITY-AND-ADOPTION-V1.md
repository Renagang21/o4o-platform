# CHECK-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1

- **WO**: [WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1](../work-orders/WO-O4O-FRONTEND-AUTH-COMMONIZATION-DEPLOYABILITY-AND-ADOPTION-V1.md)
- **일자**: 2026-08-10
- **작업 방식**: 별도 worktree(`c:/tmp/wt-auth`) + 전용 branch `work/auth-commonization-deployability` (기준 `origin/main` `88caf826a`)
- **판정**: **PASS (1건 제한 사항 명시)**

---

## 1. 문제 확정 — 배포 불가 결함

`work/frontend-auth-commonization` 은 신규 공통 패키지 `@o4o/auth-react` 를 도입하고 5개 서비스
(`web-kpa-society` · `web-neture` · `web-glycopharm` · `web-k-cosmetics` · `web-pharmacy-hub`)
`package.json` 에 `"@o4o/auth-react": "workspace:*"` 를 선언했으나,
**5개 Dockerfile 어디에도 `packages/auth-react` COPY 가 없었다.**

Docker 빌드 컨텍스트는 모노레포 루트지만 각 서비스 Dockerfile 은 필요한 패키지만 **선별 COPY** 한다.
따라서 `pnpm install --filter <service>...` 단계에서 workspace 링크가 해소되지 않는다.

**음성 대조(negative control)** — 수정 전 상태를 재현한 임시 Dockerfile 로 빌드:

```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
"@o4o/auth-react@workspace:*" is in the dependencies but no package named "@o4o/auth-react" is present in the workspace
```

→ 그대로 main 에 반영했다면 **5개 web 서비스 배포가 전부 실패**한다 (`deploy-web-services.yml` 은
`packages/**` 변경 시 5개 서비스를 모두 재빌드한다). 이것이 이번 WO 의 존재 이유다.

## 2. 수정 — Dockerfile 2줄 × 5

`@o4o/auth-react` 는 `main: ./src/index.ts` 이고 `scripts` 가 없는 **source-consumed 패키지**다
(`@o4o/types` · `@o4o/auth-client` 같은 dist 빌드 패키지와 다르다).
따라서 **COPY 만 필요하고 `pnpm --filter ... build` 라인은 추가하지 않는다.**

각 Dockerfile 에 기존 `auth-client` 바로 다음 위치로 2줄씩:

```dockerfile
COPY packages/auth-react/package.json ./packages/auth-react/   # install 단계용
COPY packages/auth-react/ ./packages/auth-react/               # source 단계용
```

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/Dockerfile` | +2 |
| `services/web-neture/Dockerfile` | +2 |
| `services/web-glycopharm/Dockerfile` | +2 |
| `services/web-k-cosmetics/Dockerfile` | +2 |
| `services/web-pharmacy-hub/Dockerfile` | +2 |

**본 WO 에서 새로 작성한 코드 변경은 위 10줄이 전부다.** 나머지 파일은 기존 브랜치 내용을 병합한 것이다.

## 3. 공통화 결과 점검 (Shared Module Change Protocol)

| 항목 | 결과 |
|---|---|
| Core 안의 서비스명 조건문 | **0건** — 차이는 전부 `ServiceAuthConfig` 주입으로 표현 |
| serviceKey 주입값 (origin/main 대비 무변경) | KPA `kpa-society` · Neture `neture` · GlycoPharm `glycopharm` · K-Cosmetics `k-cosmetics` · Pharmacy-Hub `SERVICE_KEY` |
| KPA 고유 동작 보존 | 자체 localStorage `AuthClient` 인스턴스 + `onAuthenticated` → `/kpa/me-context` 유지 |
| 로그인 실패 안내 문구 | throw → result object 로 계약만 변경, `INVALID_USER`/`INVALID_CREDENTIALS`/`ACCOUNT_NOT_ACTIVE`/`ACCOUNT_LOCKED`/`SERVICE_NOT_MEMBER`/429 문구·부가상태 전부 보존 |
| `@o4o/auth-context` (admin-dashboard 전용) | 무변경 — 이번 공통화 대상 아님 |
| 가드 판정 순서 | `isLoading` → 미인증 `Navigate(fallback, state.from)` → `redirectMap` → `allowedRoles` → `MembershipGate` |

## 4. 검증

### 4-1. 빌드 · 타입 · 테스트

| 대상 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` | PASS (lockfile 이 이미 `packages/auth-react` + 5개 링크 포함) |
| `@o4o/web-kpa-society` build | ✓ built |
| `@o4o/web-neture` build | ✓ built |
| `glycopharm-web` build | ✓ built |
| `@o4o/web-k-cosmetics` build | ✓ built |
| `pharmacy-hub-web` build | ✓ built |
| `@o4o/admin-dashboard` type-check | exit 0 |
| `@o4o/admin-dashboard` build | ✓ built |
| `packages/auth-react` 단위테스트 (vitest) | 2 files / **36 tests passed** |

### 4-2. Docker 빌드 (실제 배포 경로)

`docker build -f services/<svc>/Dockerfile .` 5건 **전부 성공**
(`web-kpa-society` · `web-neture` · `web-glycopharm` · `web-k-cosmetics` · `web-pharmacy-hub`).
음성 대조는 §1 참조. 임시 `Dockerfile.nofix` 는 검증 후 삭제했다.

### 4-3. 실브라우저 인증 · 권한 smoke

dev 서버(`vite --port 3000`) + 프로덕션 API `https://api.neture.co.kr`, 계정은
`docs/local/TEST-ACCOUNTS.local.md` 참조 (자격증명은 본 문서에 기재하지 않는다).

| 서비스 | 미인증 보호경로 차단 | 로그인 | returnUrl/역할 redirect | 권한 차단 | 로그아웃 후 재차단 | console error |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | PASS (`/store/dashboard`→`/login`) | PASS | PASS (역할기반 `/store`) | — | PASS | 0 (아래 주 참조) |
| Neture | PASS (`/admin`→`/` 로그인 모달) | PASS | **PASS** (`/admin` 복귀) | **PASS** (`/supplier/dashboard`→`/`) | PASS | 0 |
| GlycoPharm | PASS (`/operator`→`/` 로그인 모달) | PASS | PASS (`glycopharm:admin`→`/admin`) | — | PASS (`/admin`·`/operator`→`/`, token 제거) | 0 |
| K-Cosmetics | PASS (`/operator`→`/login`) | PASS | **PASS** (`/operator` 복귀) | — | PASS (`/operator`→`/login`, token 제거) | 0 |
| Pharmacy-Hub | PASS (`/store-owner/products`→`/login`) | **미검증** | — | — | — | 401 1건(의도된 실패 응답) |

**KPA 주**: 로그인 후 `/store` 에서 React DOM nesting 검증 오류 2건이 관측됐다.
이번 변경 파일 목록에 `/store` 레이아웃·페이지 컴포넌트가 **없고**(변경은 AuthContext / RoleGuard / LoginModal 뿐),
가드는 `Navigate`·children 만 렌더하므로 **본 변경과 무관한 기존 마크업 문제**로 판단한다. 인증 흐름에는 영향이 없다.

**Pharmacy-Hub 제한 사항 (숨기지 않고 명시)**: `TEST-ACCOUNTS.local.md` 에 Pharmacy-Hub 계정이 없다.
Identity V2 는 서비스별 자격증명이므로 타 서비스 계정으로는 로그인되지 않는다(실측 401 `INVALID_CREDENTIALS`).
따라서 **로그인 성공 이후 세션·가드 동선은 실브라우저로 검증하지 못했다.**
검증된 것은 ① 미인증 보호경로 차단 ② 401 응답이 새 result-object 경로를 통해 한국어 안내로 정상 표면화
③ 빌드·타입·Docker·단위테스트다.

### 4-4. Backend / Auth DB 계약

`git diff origin/main...HEAD` 기준 **`apps/api-server` 변경 0건 · migration 파일 0건**.
`packages/auth-client` · `packages/auth-utils` 변경도 0건 — 이번 작업은 프런트 계층 단독이다.

## 5. 후속 권고 (본 WO 범위 외 — 변경하지 않음)

`.github/workflows/e2e-auth-runtime.yml` 의 path filter 에 `packages/auth-react/src/**` 가 없다.
인증 런타임이 이 패키지로 이동했으므로 해당 워크플로가 트리거되지 않는다.
CI 변경은 CLAUDE.md 중지 조건이므로 이번 WO 에서는 **보고만 한다.** 별도 WO 권고.

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§5 CI path filter)
