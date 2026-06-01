# CHECK-O4O-MEMBER-MANAGEMENT-TYPESCRIPT-PREEXISTING-ERROR-BASELINE-V1

**날짜**: 2026-06-01
**목적**: Delete Flow 공통화 작업 진입 전 TypeScript 오류 기준선 확보
**범위**: 4개 서비스 + packages + api-server typecheck / dist stale 조사

---

## 1. Executive Summary

**판정: PASS** ✅

두 가지 dist stale / workspace 정합 문제를 식별하여 비코드 수단으로 해소했다.

- **root cause 1**: `packages/operator-ux-core/node_modules/@o4o/types` 심링크 누락 → `pnpm install --frozen-lockfile` 으로 복원
- **root cause 2**: `packages/account-ui/dist/index.d.ts` stale (`BusinessRegistrationFields` 미수록) → `account-ui pnpm build` 로 복원

두 수정 후 전체 5개 서비스 + api-server TypeScript **0 errors**.

GlycoPharm 서비스는 `tsconfig.json`에 `"files": []` + references 구조가 있어 `pnpm exec tsc --noEmit` 시 실제 type-checking이 수행되지 않는 구조적 특이점이 있다. `tsconfig.app.json` 직접 검사 시 GlycoPharm 전용 pre-existing 오류(LMS/Hub 관련, 회원 관리 무관) 8개가 존재하며, `@o4o/types` / `BusinessRegistrationFields` 오류는 이미 해소되었다.

**Delete Flow 공통화 진행 가능** — TypeScript 기준선 확보됨.

---

## 2. 작업 전 git 상태

```
?? admin-suppliers-recheck.png
?? glycopharm-members-page.png  (+ 기타 PNG)
```

staged 없음. 다른 세션 WIP 없음. clean 상태에서 시작.

---

## 3. TypeScript 오류 현황 (수정 전)

| 서비스 | 오류 수 | 대표 오류 | 분류 |
|--------|:------:|---------|:---:|
| web-glycopharm | 0 (가짜) | `tsconfig.json files:[]` — 실제 검사 없음 | — |
| web-glycopharm (app.json) | 10 | `@o4o/types` ×2, LMS/Hub 오류 ×8 | B (회원 관리 무관) |
| web-k-cosmetics | 6 | `@o4o/types` ×2, `BusinessRegistrationFields` ×4 | A (dist stale) |
| web-neture | 6 | `@o4o/types` ×2, `BusinessRegistrationFields` ×4 | A (dist stale) |
| web-kpa-society | 3 | `@o4o/types` ×2, `BusinessRegistrationFields` ×1 (via src path) | A (dist stale) |
| api-server | 0 | — | ✅ |

### `@o4o/types` 오류 근원 분석

모든 서비스에서 반복되는 오류:
```
../../packages/operator-ux-core/src/layout/OperatorAreaShell.tsx(31,41): Cannot find module '@o4o/types'
../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx(28,41): Cannot find module '@o4o/types'
```

**원인**: `packages/operator-ux-core/package.json`에 `"@o4o/types": "workspace:*"` 의존성이 선언되어 있으나, pnpm workspace link가 누락 → `packages/operator-ux-core/node_modules/@o4o/` 에 `ui@`만 존재하고 `types@`가 없었음.

**operator-ux-core가 src를 직접 노출하므로** (package.json `exports: "./src/index.ts"`) 서비스가 type-check 시 packages/operator-ux-core/src/ 파일들을 직접 type-check → @o4o/types 참조 실패.

### `BusinessRegistrationFields` 오류 근원 분석

오류 패턴:
```
Module '"@o4o/account-ui"' has no exported member 'BusinessRegistrationFields'
```

**원인**: `packages/account-ui/src/index.ts`에 `BusinessRegistrationFields` export가 추가되었으나, `packages/account-ui/dist/index.d.ts`가 재빌드되지 않아 dist에 미반영.

**KPA 특이 케이스**: KPA tsconfig.json에 `"@o4o/account-ui": ["../../packages/account-ui/src"]` path 매핑이 있어 src를 직접 참조 → account-ui src에서 `@o4o/types` 임포트 → `@o4o/types` not found 오류로 변환됨.

---

## 4. 수행한 비코드 수정

### Step 1 — pnpm install (workspace symlink 복원)

```bash
pnpm install --frozen-lockfile
```

결과:
- `packages/operator-ux-core/node_modules/@o4o/types@` 심링크 생성됨
- lockfile 변경 없음
- git status: 변경 없음 (node_modules는 gitignore)

### Step 2 — account-ui dist 재빌드

```bash
cd packages/account-ui && pnpm build
```

결과:
- `packages/account-ui/dist/index.d.ts`에 `BusinessRegistrationFields` export 반영됨
- dist 변경사항이 많지만 이는 stale 정합화 — source는 미수정
- git status: 변경 없음 (dist는 gitignore)

---

## 5. TypeScript 오류 현황 (수정 후)

| 서비스/검사 방법 | 오류 수 | 상태 |
|----------------|:------:|:----:|
| web-kpa-society (`tsc --noEmit`) | **0** | ✅ |
| web-k-cosmetics (`tsc --noEmit`) | **0** | ✅ |
| web-neture (`tsc --noEmit`) | **0** | ✅ |
| web-glycopharm (`tsc --noEmit`, tsconfig.json) | **0** (구조적) | ⚠️ |
| web-glycopharm (`tsc --noEmit -p tsconfig.app.json`) | **8** | ⚠️ B분류 |
| api-server (`tsc --noEmit`) | **0** | ✅ |

### GlycoPharm tsconfig.app.json 잔존 오류 8개 (회원 관리 무관)

| 파일 | 오류 | 분류 |
|------|------|:---:|
| `src/pages/education/LmsLessonPage.tsx:334,335` | type overlap (quiz/assignment vs video/article) | B |
| `src/pages/hub/HubBlogLibraryPage.tsx:62` | serviceKey not in HubContentListParams | B |
| `src/pages/hub/HubContentListPage.tsx:29,30` | publishedAt not on HubContentItemResponse | B |
| `src/pages/instructor/InstructorDashboardPage.tsx:183,187` | divide/truncate not in CSS Properties | B |
| `src/pages/resources/ResourcesPage.tsx:31` | implicit any | B |

**모두 LMS/Hub 관련 오류** — 회원 관리 Delete Flow 공통화와 무관.

---

## 6. 회원 관리 관련 타입 정합 확인

| 타입/컴포넌트 | 위치 | 상태 |
|-------------|------|:----:|
| `OperatorMembersConsolePageProps` (+ `searchPlaceholder`) | `packages/operator-core-ui/src/modules/members/types.ts` | ✅ |
| `MembersConsoleClient` | 동일 | ✅ |
| `CommonEditUserModal` props | `packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx` | ✅ |
| `KpaEditUserModal` props | 동일 디렉터리 | ✅ |
| `MemberListLayout` props (`searchPlaceholder` 포함) | `packages/operator-ux-core/src/member-list/MemberListLayout.tsx` | ✅ |
| `StatusBadge` / `RoleBadge` | `packages/operator-ux-core/src/` | ✅ |
| `DataTable` / `ListColumnDef` | `packages/operator-ux-core/src/` | ✅ |
| `ActionBar` / `BulkResultModal` / `RowActionMenu` / `BaseDetailDrawer` | `packages/ui/src/` | ✅ |
| `MemberHardDeleteConfirmModal` | `packages/operator-core-ui/src/modules/members/components/` | ✅ |

모든 회원 관리 관련 타입이 정상 해석됨.

---

## 7. Delete Flow 공통화 사전 리스크

| 리스크 항목 | 상태 | 비고 |
|-----------|:----:|------|
| 4개 서비스 TypeScript 클린 | ✅ | kpa/kcos/neture/api-server 0 errors |
| Delete 관련 타입 stale | ❌ 없음 | `MemberHardDeleteConfirmModal` 등 정상 |
| admin page 타입 오류 | ❌ 없음 | GP/KCOS admin 0 errors |
| hard/soft delete mode 타입 | ✅ 동일 | 4서비스 모두 `'soft' | 'hard'` 패턴 |
| Delete API response 타입 | ✅ 단일 endpoint | `/operator/members/:id?mode=` |
| GlycoPharm tsconfig 구조 특이점 | ⚠️ | `files:[]` 로 실제 검사 없음 — Delete Flow WO에서 주의 필요 |

### GlycoPharm tsconfig 특이점 주의사항

Delete Flow WO에서 GlycoPharm 변경 후 TypeScript 검증 시 **반드시 `tsc --noEmit -p tsconfig.app.json`** 으로 실제 검사를 수행해야 한다. `tsc --noEmit` 단독으로는 GlycoPharm 오류를 놓칠 수 있다.

---

## 8. 오류 분류 A/B/C/D

| 분류 | 설명 | 건수 | 항목 |
|:---:|------|:---:|------|
| **A** | dist stale / symlink — 비코드 수단으로 해소됨 | 0 | (해소됨) |
| **B** | 실제 오류지만 회원 관리 무관 | 8 | GlycoPharm LMS/Hub 오류 |
| **C** | 회원 관리 Delete Flow에 직접 영향 | 0 | 없음 |
| **D** | 다른 세션 WIP | 0 | 없음 |

**현재 Delete Flow 작업 진행에 장애가 되는 오류 없음.**

---

## 9. 권장 다음 단계

1. **WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1** 진행 가능
2. Delete Flow WO에서 GlycoPharm 검증 시 `tsc --noEmit -p tsconfig.app.json` 사용 필요
3. GlycoPharm LMS/Hub 오류 8개는 Delete Flow WO 이후 별도 WO 대상

---

## 10. Working tree / staged 파일 격리 상태

```
?? *.png (untracked, 사용자 스크린샷)
```

staged 없음. dist는 gitignore. source file 수정 없음. 다른 세션 WIP 없음.

---

## 최종 판정

**PASS** ✅

| 항목 | 결과 |
|------|:----:|
| @o4o/types 심링크 stale | 해소 (pnpm install) |
| account-ui dist stale | 해소 (pnpm build) |
| 회원 관리 직접 관련 TS 오류 | 없음 |
| kpa/kcos/neture/api-server 0 errors | ✅ |
| Delete Flow 진행 가능 여부 | **가능** |
| source file 수정 | 없음 |
| git 변경 | 없음 |
| 다른 세션 WIP | 없음 |

---

*검증 수행: Claude Code (2026-06-01)*
