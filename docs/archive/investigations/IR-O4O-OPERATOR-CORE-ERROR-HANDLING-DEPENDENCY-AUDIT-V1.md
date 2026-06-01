---
id: IR-O4O-OPERATOR-CORE-ERROR-HANDLING-DEPENDENCY-AUDIT-V1
title: packages/operator-core-ui — @o4o/error-handling 모듈 미발견 오류 원인 조사
status: completed
date: 2026-05-24
domain: operator-core-ui / packages / dependency
related:
  - WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1
  - WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
  - WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
  - WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
---

# IR-O4O-OPERATOR-CORE-ERROR-HANDLING-DEPENDENCY-AUDIT-V1

> `packages/operator-core-ui` 내부 3개 파일에서 발생하는 `TS2307: Cannot find module '@o4o/error-handling'` 오류의 근본 원인을 조사한다. 코드는 변경하지 않으며, 원인 분류 + 영향 파일 + 권장 수정 방향(1안)을 정리한다.

---

## 1. 관측된 오류 (web-kpa-society build, 2026-05-24)

```
packages/operator-core-ui/src/modules/members/KpaEditUserModal.tsx(19,23):
  error TS2307: Cannot find module '@o4o/error-handling' or its corresponding type declarations.
packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx(51,23):
  error TS2307: ... (동일)
packages/operator-core-ui/src/modules/resources/OperatorResourcesConsolePage.tsx(35,23):
  error TS2307: ... (동일)
```

## 2. 조사 결과

### 2.1 `@o4o/error-handling` 패키지 존재 — ✅

| 항목 | 결과 |
|------|------|
| `packages/error-handling/` 경로 | **존재** |
| `packages/error-handling/package.json` | 정상 — `name: "@o4o/error-handling"` |
| `main` / `types` / `exports` | `./src/index.ts` (src-only export — dist 빌드 안 함) |
| `src/index.ts` | 정상 (`parseApiError`, `ErrorBoundary`, `ToastProvider` 등 export) |
| pnpm-workspace.yaml | `packages/*` 포함 — 자동 등록 대상 |

→ **패키지 자체는 정상**. workspace에도 정상 등록.

### 2.2 `operator-core-ui` 의 dependency 선언 — ✅

[`packages/operator-core-ui/package.json`](packages/operator-core-ui/package.json):
```json
"dependencies": {
  "@o4o/content-editor": "workspace:*",
  "@o4o/error-handling": "workspace:*",        // ← 정상 등록됨
  "@o4o/operator-ux-core": "workspace:*",
  "@o4o/shared-space-ui": "workspace:*",
  "@o4o/ui": "workspace:*"
}
```

→ **dependency 등록은 정상**. `workspace:*` protocol로 monorepo 내부 패키지 참조.

### 2.3 node_modules 실제 symlink — ❌ 누락

`packages/operator-core-ui/node_modules/@o4o/` 디렉토리 실제 내용:
```
operator-ux-core -> /c/Users/sohae/o4o-platform/packages/operator-ux-core
shared-space-ui  -> /c/Users/sohae/o4o-platform/packages/shared-space-ui
ui               -> /c/Users/sohae/o4o-platform/packages/ui
```

| dependency | symlink 존재? | install 일자 |
|------------|:------------:|:-----------:|
| `@o4o/operator-ux-core` | ✅ | May 3 |
| `@o4o/shared-space-ui` | ✅ | May 6 |
| `@o4o/ui` | ✅ | May 3 |
| **`@o4o/error-handling`** | **❌ 부재** | — |
| **`@o4o/content-editor`** | **❌ 부재** | — |

추가:
- root `node_modules/@o4o/error-handling` → **부재** (hoist 대상 아님 또는 미설치)
- `services/web-kpa-society/node_modules/@o4o/error-handling` → ✅ symlink (March 17 install)

### 2.4 web-kpa-society 와의 비교 — 결정적 단서

web-kpa-society에서는 같은 import (`import { toast } from '@o4o/error-handling'`)가 **정상 동작** (build 통과). 즉 import 경로 자체는 올바름. 패키지 alias / tsconfig path 도 무관.

차이점은 **node_modules symlink 존재 여부 단 하나**.

### 2.5 tsconfig / exports / vite alias — 모두 정상

| 항목 | 결과 |
|------|------|
| `operator-core-ui/tsconfig.json` paths | **paths 자체 없음** — workspace symlink로 처리 (정상) |
| `moduleResolution` | `bundler` (정상) |
| `@o4o/error-handling/package.json exports` | `./src/index.ts` — 명시적 (정상) |
| vite alias 설정 | 본 IR 범위 외 (web-kpa-society build는 통과) |

→ **tsconfig / exports / alias 모두 원인 아님**.

### 2.6 git history — 원래 깨졌나 vs 최근 확산

| commit | 파일/변경 |
|--------|----------|
| `46c64f034` | `fix(content)`: package.json에 `@o4o/error-handling` dependency 추가 |
| `181d0ec14` | `OperatorResourcesConsolePage.tsx` 추가 (이 IR의 3건 중 사전 존재로 분류된 파일) |
| `a5874c15d` | `KpaEditUserModal.tsx` 추가 (다른 세션 — KPA EditUser 추출 WO) |
| `a8becbadd` | `OperatorMembersConsolePage.tsx` 추가 (다른 세션 — 3 service 통합 WO) |

→ dep 등록 commit (`46c64f034`) 이후 import 사용 파일들이 순차 추가됨. **import 자체는 정상적인 사용 패턴** (web-kpa-society 동일 import 정상 동작). 다만 dep 등록 후 어느 시점부터 **`pnpm install` 이 실행되지 않아 symlink 생성이 누락**된 상태로 지속됨.

---

## 3. 원인 분류 (5 후보 중 결정)

| # | 후보 | 판정 | 근거 |
|:-:|------|:----:|------|
| 1 | 패키지 없음 | ❌ | `packages/error-handling/` 정상 존재 |
| 2 | **dependency 누락 + pnpm install 미실행** | **✅** | package.json은 등록되어 있으나 node_modules에 symlink 미생성. install 시점은 May 3 / May 6 (다른 패키지) — error-handling은 그 후 추가된 듯 |
| 3 | tsconfig path 누락 | ❌ | workspace symlink 방식이라 paths 자체 불필요. web-kpa-society 동일 설정으로 작동 |
| 4 | exports 누락 | ❌ | `@o4o/error-handling/package.json` exports 정상 |
| 5 | 잘못된 import | ❌ | web-kpa-society가 같은 import로 정상 작동 — 패턴 자체 옳음 |

**확정 원인 — #2: dependency 등록은 됐지만 `pnpm install` 미실행으로 workspace symlink가 생성되지 않음.**

부수 확인: `@o4o/content-editor`도 symlink 부재 → 같은 install 누락에 함께 영향받음 (TypeScript에서는 별도 에러로 잡혔거나 사용처가 다른 경로 — 본 IR 추가 조사 외).

---

## 4. 영향 파일

### 4.1 직접 에러 (3건)

| 파일 | line | import |
|------|:----:|--------|
| `packages/operator-core-ui/src/modules/members/KpaEditUserModal.tsx` | 19 | `from '@o4o/error-handling'` |
| `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` | 51 | 동일 |
| `packages/operator-core-ui/src/modules/resources/OperatorResourcesConsolePage.tsx` | 35 | 동일 |

### 4.2 잠재 영향 (동일 install 누락)

| dependency | 영향 |
|-----------|------|
| `@o4o/error-handling` | 위 3건 직접 |
| `@o4o/content-editor` | (사용처 별도 확인 필요 — 본 IR 범위 외) |

### 4.3 build 차단 범위

- **api-server build**: 영향 없음 (별도 trace의 hub-content `authorId` 에러 + `passwordResetService` 사전존재 에러만)
- **web-kpa-society build**: 차단됨 (위 3건 + 사전존재 `OperatorResourcesConsolePage` 1건이 합산)

---

## 5. 권장 수정 방향 (1안)

### 5.1 최소 fix — `pnpm install` 단독 실행

```bash
# repo root 에서
pnpm install
```

근거:
- dep는 이미 정상 등록 (`46c64f034` commit)
- pnpm이 lockfile 갱신 + node_modules symlink 자동 생성
- 코드 / 패키지 구조 / alias / tsconfig 모두 변경 0
- 위험 가장 낮음

검증:
```bash
ls -la packages/operator-core-ui/node_modules/@o4o/
# → error-handling 및 content-editor symlink 생성 확인
cd services/web-kpa-society && npx tsc --noEmit
# → 3건 TS2307 해결 확인 (사전 존재 1건은 별도)
```

### 5.2 차선 (1안이 안 풀릴 경우)

- `pnpm install --force` 로 강제 재링크
- `pnpm-lock.yaml` 에 `@o4o/error-handling` workspace 항목 누락 여부 확인 후 lockfile 재생성
- 마지막 수단: `packages/operator-core-ui/` 내 `rm -rf node_modules` 후 `pnpm install`

### 5.3 후속 권장

dep 추가 시 install 누락 방지를 위해:
- **PR CI 워크플로에 `pnpm install --frozen-lockfile` 단계 검증** (이미 있을 가능성 — 별도 audit)
- 또는 `.husky/pre-commit` 에 package.json 변경 시 `pnpm install` 자동 실행 hook
- 본 IR 범위 외 — 별도 워크플로 개선 WO 후보

---

## 6. Drift Guard / 본 IR 범위 외

| 항목 | 사유 |
|------|------|
| `passwordResetService.ts:94, :217` TS2554 | api-server 사전 존재 에러 — 별도 bugfix WO |
| `@o4o/content-editor` symlink 누락 (동일 install 누락) | 사용처 별도 확인 후속 |
| PR CI install 검증 워크플로 | 별도 워크플로 audit WO |
| 코드 / 패키지 구조 / alias / tsconfig 변경 | 본 IR 권장: **install 단독으로 해결 가능** — 변경 0 |

---

## 7. 결론

| 질문 | 답 |
|------|-----|
| @o4o/error-handling 패키지 존재? | ✅ |
| dep 등록 정상? | ✅ |
| node_modules symlink 정상? | ❌ — **누락** (install 미실행) |
| tsconfig / exports / alias 문제? | ❌ — 정상 |
| 잘못된 import? | ❌ — web-kpa-society 동일 import 작동 |
| 원래 깨졌나 vs 최근 확산? | dep 등록 (`46c64f034`) 후 import 3건 (`181d0ec14`/`a5874c15d`/`a8becbadd`) 순차 추가 — 같은 install 누락 상태에서 누적된 패턴 |
| 권장 수정 1안 | **`pnpm install`** (repo root) — 한 줄 fix, 변경 0, 위험 최저 |

---

## 8. 산출물 요약

| 항목 | 결과 |
|------|------|
| 원인 분류 | **dependency 등록 후 `pnpm install` 미실행 → workspace symlink 누락** |
| 영향 파일 직접 | 3건 (KpaEditUserModal / OperatorMembersConsolePage / OperatorResourcesConsolePage) |
| 잠재 영향 | `@o4o/content-editor` symlink 동시 누락 (사용처 별도 확인) |
| build 차단 | web-kpa-society |
| 권장 1안 | `pnpm install` 단독 실행 |
| 코드 변경 | **없음** (조사 전용 IR) |
| 후속 WO | (1) 사용자 결정 후 `pnpm install` 실행 + 검증 (2) `@o4o/content-editor` 사용처 audit (3) PR CI install 검증 워크플로 audit (4) passwordResetService bugfix |

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for `pnpm install` (사용자 확인 후 실행)*
