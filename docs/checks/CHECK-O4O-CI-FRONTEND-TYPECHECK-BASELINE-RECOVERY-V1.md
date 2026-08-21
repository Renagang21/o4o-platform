# CHECK-O4O-CI-FRONTEND-TYPECHECK-BASELINE-RECOVERY-V1

- **WO**: `WO-O4O-CI-FRONTEND-TYPECHECK-BASELINE-RECOVERY-V1` — CI frontend type-check baseline 복구
- **작성일**: 2026-08-21
- **기준 커밋(base)**: `18797cfd9` (origin/main)
- **작업 위치**: fresh worktree `C:/tmp/o4o-ci-tc` (node_modules 없는 상태에서 `pnpm install --frozen-lockfile`)
- **판정**: **PASS** — 실패 모집단 4건 전부 단일 원인(A: MISSING_DEPENDENCY / phantom import), 검증 수준 완화 0건

---

## 1. CI 실패 재현 (§3)

| 항목 | 값 |
|------|-----|
| Workflow | `.github/workflows/ci-pipeline.yml` → job `Code Quality Check` |
| 실패 step | `Run TypeScript check (Frontend only)` (`pnpm run type-check:frontend`) — **이 step 하나만 실패** |
| 참조 CI run | `32446364547` |
| 로컬 재현 | 동일 명령 exit 1, `error TS` 4건 — CI 로그와 **byte-identical** |
| 로컬 재현 요약줄 | `type-check:frontend: 2 step(s) FAILED` (`apps/admin-dashboard`, `apps/main-site`) |

CI-only 오류(카테고리 I)는 **0건**이다. 로컬 clean install 재현이 CI 오류 집합과 완전히 일치했다.

## 2. 전체 실패 모집단 census (§4) — 미조사 0

| # | 파일 | 위치 | 오류 | 모듈 | 분류 |
|---|------|------|------|------|------|
| 1 | `apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` | (55,24) | TS2307 | `date-fns` | **A** MISSING_DEPENDENCY |
| 2 | `apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` | (56,20) | TS2307 | `date-fns/locale` | **A** |
| 3 | `apps/main-site/src/components/forum/notifications/NotificationItem.tsx` | (8,37) | TS2307 | `date-fns` | **A** |
| 4 | `apps/main-site/src/components/forum/notifications/NotificationItem.tsx` | (9,20) | TS2307 | `date-fns/locale` | **A** |

**카테고리별 집계**

| 분류 | 건수 |
|------|-----:|
| A MISSING_DEPENDENCY | 4 |
| B WORKSPACE_PACKAGE_NOT_BUILT | 0 |
| C WRONG_PACKAGE_DEPENDENCY_DECLARATION | 0 |
| D TS_CONFIG_RESOLUTION | 0 |
| E EXPORT/MODULE_ENTRYPOINT | 0 |
| F GENERATED_DIST_DEPENDENCY | 0 |
| G VERSION_MISMATCH | 0 |
| H REAL_TYPESCRIPT_ERROR | 0 |
| I CI_ONLY_ENVIRONMENT | 0 |
| J OTHER | 0 |
| **미조사** | **0** |

> 초기 CI 로그(`6ce7c84bb`)에는 `services/web-pharmacy-hub` TS6133 2건도 있었으나, `ee8ba929f` 에서 이미 해소되어 현재 모집단에 없다(`git log 6ce7c84bb..origin/main -- services/web-pharmacy-hub/src/App.tsx` 로 확인).

## 3. `date-fns` 근본 원인 (§5) — phantom dependency

| 확인 항목 | 결과 |
|-----------|------|
| `date-fns` 를 선언한 package.json | **0개** (root / apps / services / packages 전부) |
| `pnpm-lock.yaml` 내 `date-fns` | **0건** (`grep -c` = 0) |
| 과거 상태 | 커밋 `7d9c056cc` 에서 저장소 전역 제거 |
| 남아 있던 것 | import 2파일 4줄 + `apps/admin-dashboard/vite.config.ts` 의 dead `optimizeDeps.include` 항목 |
| phantom hoisting 여부 | 해당 없음 — 어떤 경로로도 설치되지 않으므로 hoisting 으로 통과한 적 없음 |

**판정**: 의도적으로 제거된 의존성의 **import 잔재**. 로컬에서 통과했던 것이 아니라, 이 두 파일이 type-check 대상에 포함된 시점부터 CI 에서만 상시 실패한 것이다.

**수정 방향 결정**: `date-fns` 재도입이 아니라 **제거 완결**.
근거 — (a) 저장소가 명시적으로 걷어낸 의존성이고 재사용할 기존 버전이 저장소에 없다, (b) 두 호출부의 요구가 `yyyy-MM-dd HH:mm[:ss]` 포맷과 상대시간 표기뿐이며 **동일 저장소에 이미 같은 패턴의 로컬 헬퍼가 있다**, (c) lockfile·package.json 무변경으로 해결 가능하다.

## 4. dependency ownership (§6)

| 항목 | 결과 |
|------|------|
| root package.json 에 몰아넣기 | 하지 않음 |
| lockfile 변경 | **0** (`pnpm-lock.yaml` 무수정) |
| package.json 변경 | **0** |
| `skipLibCheck` / paths alias 우회 | 하지 않음 |
| CI 에 `pnpm add` 삽입 | 하지 않음 |

## 5. workspace build order (§7)

| 대상 | 해석 경로 | 판정 |
|------|-----------|------|
| `apps/admin-dashboard` 의 `@o4o/*` | `tsconfig.json` paths → `../../packages/*/src` | **SOURCE_RESOLVABLE** (build order 무관) |
| `apps/main-site` | alias 는 `@/*`, `@o4o-apps/signage` 뿐, `@o4o/utils` 미의존 | 영향 없음 |
| `@o4o/security-core` | package `types` = `./dist/index.d.ts` 인데 `build:packages` 체인에 없음 | **잠재 BUILD_REQUIRED 위험** — 현재는 admin-dashboard 의 paths alias 가 가려주고 있음 (§9 잔여 부채 1) |

이번 실패 모집단에 build order 원인은 **없다**.

## 6. workflow 정합성 (§8)

`.github/workflows/ci-pipeline.yml` 및 `.github/actions/setup-build-env` 는 **정상**이다. 실패는 전적으로 소스 쪽 원인이었으므로 **workflow 는 수정하지 않았다**(§2 "CI workflow 자체를 먼저 바꾸지 않는다" 준수).

## 7. 수정 내역 (§9~§11) — 3파일

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` | `date-fns` / `date-fns/locale` import 제거 → 로컬 `formatDateTime()` 헬퍼로 대체. 출력 포맷 `yyyy-MM-dd HH:mm` · `yyyy-MM-dd HH:mm:ss` **동일 유지** |
| `apps/main-site/src/components/forum/notifications/NotificationItem.tsx` | 두 import 제거 → 같은 forum 컴포넌트들(`ForumCommentSection` / `ForumHome` 등)이 이미 쓰는 상대시간 헬퍼와 동일 형식의 로컬 `formatRelativeTime()` 로 대체 |
| `apps/admin-dashboard/vite.config.ts` | `optimizeDeps.include` 의 dead `'date-fns'` 항목 제거 |

**금지 항목 위반 0**: type-check job 제거 / `continue-on-error` / `|| true` / skip / tsconfig 완화 / strict 해제 — 어느 것도 하지 않았다.

## 8. 검증 (§12~§15)

| 검증 | 명령 | 결과 |
|------|------|------|
| clean install | fresh worktree + node_modules 없음 + `pnpm install --frozen-lockfile` | PASS (lockfile drift 0) |
| frontend type-check (수정 전) | `pnpm run type-check:frontend` | FAIL — `error TS` 4건 / `2 step(s) FAILED` |
| frontend type-check (수정 후) | `pnpm run type-check:frontend` | **PASS** — `type-check:frontend: OK`, `error TS` **0건** |
| 대상 범위 | app-store packages(`forum-app`,`forum-neture`) + `apps/*`(api-server 제외) + `services/*` 전체 | 전부 통과 |
| production build (main-site) | `bash scripts/ci-build-app.sh main-site` | **PASS** (exit 0) |
| production build (admin-dashboard) | `bash scripts/ci-build-app.sh admin-dashboard` | (아래 §8-1) |
| 실제 GitHub Actions | push 후 `CI Pipeline` 실행 | **PASS** (아래 §8-2) |

### 8-1. admin-dashboard build
`bash scripts/ci-build-app.sh admin-dashboard` → **PASS** (exit 0). 스크립트 내부의 `pnpm install` 이후에도 `pnpm-lock.yaml` 변경 0건.

### 8-2. 실제 GitHub Actions 검증 (§15)
| 대상 커밋 | run | `Run TypeScript check (Frontend only)` | 비고 |
|-----------|-----|----------------------------------------|------|
| `0f5641a84` (수정 전) | `32447022710` | **failure** | 이 step 단독 실패 |
| `a066ef81a` (이번 수정) | `32447888163` | **success** | App Store packages step 도 success. 이후 다른 세션 push 로 concurrency `cancel-in-progress` 발동해 run 전체는 cancelled |
| `46216e841` (수정 이후 main) | `32448253785` | **success** | run 결론은 failure 이나 실패 step 은 `Run tests (api-server Jest)` 하나뿐 |

**판정**: WO 대상 step 은 실제 GitHub Actions 에서 **복구 확인**됐다. 이번 변경으로 새로 깨진 step 은 **0건**이다.

**무관한 잔여 CI 부채(이번 범위 밖)**: run `32448253785` 의 `Run tests (api-server Jest)` 실패 = `src/__tests__/forum-owner-area-commonization.spec.ts` › "Pharmacy-Hub — 소유자 영역을 신설하지 않는다 (census NOT_IMPLEMENTED 유지)". 다른 세션의 PharmacyHub 커밋(`46216e841`)에서 유입된 backend 테스트 실패이며 frontend type-check 와 무관하다. 수정하지 않고 보고만 한다.

## 9. before/after 회귀 비교 (§16)

| 지표 | 수정 전 | 수정 후 |
|------|--------:|--------:|
| `type-check:frontend` exit | 1 | 0 |
| `error TS` 총 건수 | 4 | **0** |
| FAILED step 수 | 2 | 0 |
| 신규 오류 | — | **0** |
| lockfile / package.json 변경 | — | 0 |

## 10. 잔여 부채 (별도 WO 대상 — 이번 범위 밖)

1. **`@o4o/security-core` dist 계약** — package `types` 가 `./dist/index.d.ts` 인데 `build:packages` 체인에 없다. 현재는 admin-dashboard 의 `@o4o/*` → `packages/*/src` paths alias 가 가려주고 있어 잠재적 BUILD_REQUIRED 위험이 남는다.
2. **`vite.config.shared.ts:76`** — `manualChunks` 의 `id.includes('date-fns')` 조건이 dead 상태로 남아 있다. 공용 config 이므로 Shared Module Change Protocol 대상이라 이번에 손대지 않았다(동작 영향 0).
3. **`workspace-packages.json`** — 다른 머신 경로(`/home/sohae21/...`)가 박힌 stale snapshot 이며 `date-fns` 등 이미 없는 패키지를 포함한다. type-check 소비 경로는 아니다.
4. **`apps/admin-dashboard/dist-node/**`** — 추적 중인 빌드 산출물에 옛 `date-fns` 문자열이 남아 있다. 생성물이므로 소스 수정 대상 아님.

## 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (`@o4o/security-core` dist 계약 — 위 §10-1)
