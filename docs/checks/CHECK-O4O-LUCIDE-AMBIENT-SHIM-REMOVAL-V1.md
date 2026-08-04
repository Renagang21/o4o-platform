# CHECK-O4O-LUCIDE-AMBIENT-SHIM-REMOVAL-V1

- **WO**: `WO-O4O-LUCIDE-AMBIENT-SHIM-REMOVAL-V1`
- **선행**: `WO-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1` (`dev.mjs` 종료코드 정상화 — 본 WO 의 오류 탐지 신뢰성 전제)
- **일자**: 2026-08-04
- **판정**: **PASS** (로컬 검증 완료 · CI GREEN 확인은 push 후 별도)

---

## 1. 문제

`declare module 'lucide-react'` ambient 선언이 4곳에 존재했고, 이것이 **실제 lucide-react 타입 정의를 완전히 가리고 있었다.**

- shorthand 형태(`declare module 'lucide-react';`)는 모듈 전체를 `any` 로 만든다 → 존재하지 않는 아이콘 import, 잘못된 prop 전달이 **전부 통과**
- 전체 선언 형태(`export const X: Icon;` 나열)는 나열되지 않은 아이콘을 막고, 실제 `LucideProps` 대신 임의 타입을 강제한다
- 부작용으로 `LucideIcon` 이 타입이 아닌 namespace 로 잡혀 소비 패키지에서 TS2709 를 유발했다 (선행 WO 에서 우회 처리)

---

## 2. 제거한 shim (4 → 0)

| # | 경로 | 형태 | 처리 |
|---|------|------|------|
| S1 | `types/lucide-react.d.ts` | 전체 선언 (아이콘 120종 나열) | **파일 삭제** (디렉터리도 비어 제거) |
| S2 | `packages/shortcodes/src/lucide-react.d.ts` | 전체 선언 (아이콘 26종 나열) | **파일 삭제** |
| S3 | `apps/admin-dashboard/src/types/index.d.ts` | shorthand (파일 전체가 이 1줄) | **파일 삭제** |
| S4 | `apps/admin-dashboard/src/global.d.ts:1` | shorthand | **해당 1줄만 삭제** (`@heroicons/react/24/outline` shorthand 는 별개 사안이므로 유지) |

부수 정리: `tsconfig.json` 의 `include` 에서 dangling glob `"types/**/*.d.ts"` 제거 (해당 디렉터리 소멸).

**검증**: 리포 전역 `declare module 'lucide-react'` 잔존 **0건**.

---

## 3. 드러난 실제 타입 오류 7건과 수정

shim 제거 직후 `apps/admin-dashboard` 에서 정확히 7건이 드러났다 (WO 예상치와 일치).

| # | 위치 | 오류 | 실체 | 수정 |
|---|------|------|------|------|
| E1 | `src/utils/block-icons.tsx:183` | TS2724 `has no exported member named 'Shift'` | **존재하지 않는 아이콘 import**. 파일 내 사용처 없음 (import 목록에만 존재) | import 제거 |
| E2 | `src/components/editor/blocks/media/ImageEditingTools.tsx:21` | TS2305 `no exported member 'AspectRatio'` | **존재하지 않는 아이콘 import**. 파일 내 사용처 없음 (`AspectRatio` 는 `cover/types.ts` 의 동명 *타입*이며 별개) | import 제거 |
| E3 | `src/components/editor/blocks/StandardBlockTemplate.tsx:36` | TS2693 `'LucideIcon' only refers to a type, but is being used as a value` | `icon: typeof LucideIcon` — 타입에 `typeof` 오적용 | `icon: LucideIcon` |
| E4 | `src/hooks/useAdminMenu.ts:272` | TS2769 `'className' does not exist in type 'Attributes'` | `iconMap` 이 `Record<string, React.ComponentType>` (= props `{}`) 로 선언돼 `createElement(Icon, {className})` 불가 | `Record<string, LucideIcon>` + `import type { LucideIcon }` |
| E5 | `src/components/editor/blocks/ConditionalBlock.tsx:124` | TS2322 `Property 'title' does not exist` | lucide 아이콘에 `title` prop 전달. `LucideProps` 에 없음 — 인라인 SVG 에서 `title` **속성**은 툴팁을 만들지 않으므로 실질 무효 코드였음 | `aria-label` 로 교체 (접근성 의도 보존, 렌더 결과 변화 없음) |
| E6 | `src/components/editor/blocks/ConditionalBlock.tsx:126` | 동일 | 동일 | 동일 |
| E7 | `src/pages/cms/slots/CMSSlotList.tsx:359` | 동일 (`Lock` 아이콘 `title={lockedReason}`) | 동일 | 동일 |

**아이콘 선택 동작 무변경**: E1/E2 는 사용되지 않던 import 이므로 렌더되는 아이콘 집합이 바뀌지 않는다. E3/E4 는 타입 표기만, E5~E7 은 속성명만 변경.

---

## 4. 선행 WO 우회 코드 원복

선행 WO 에서 shim 때문에 불가피하게 넣었던 우회를 원복했다 (shim 이 사라졌으므로 실제 타입 사용 가능).

| 파일 | 원복 |
|------|------|
| `packages/operator-ux-core/src/blocks/ActionIcon.tsx` | `type IconComponent = ComponentType<Record<string, unknown>>` 및 우회 사유 주석 삭제 → `Record<string, LucideIcon>` |
| `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` | 동일 |

렌더 코드는 양쪽 모두 미변경.

---

## 5. 검증 결과

| 항목 | 명령 | 결과 |
|------|------|------|
| admin-dashboard typecheck | `npx tsc --noEmit` | **EXIT 0** (7건 → 0건) |
| shortcodes typecheck | `pnpm --filter @o4o/shortcodes run type-check` | **EXIT 0** |
| operator-ux-core typecheck | `npx tsc --noEmit -p tsconfig.json` | **EXIT 0** |
| 프론트 전체 typecheck | `node scripts/dev.mjs type-check:frontend` | **EXIT 0** (`type-check:frontend: OK`) — main-site · admin-dashboard · web-kpa-society · dropshipping-core · dropshipping-cosmetics · forum-yaksa |
| 나머지 web 서비스 typecheck | `npx tsc --noEmit` ×5 | web-neture / web-glycopharm / web-k-cosmetics / web-account / signage-player-web **각 errors=0** (S1 루트 shim 제거 연쇄 없음 확인) |
| lint | `node scripts/dev.mjs lint` | **EXIT 0** |
| admin-dashboard test | `npx vitest run --pool=forks --poolOptions.forks.maxForks=1` | **12 files / 220 tests PASS** |
| admin-dashboard build | `bash scripts/ci-build-app.sh admin-dashboard` | **EXIT 0** (`✅ Build completed successfully!`) |

### 5.1 CI

CI 의 `quality-check` 는 `pnpm run type-check:frontend` (blocking) → `typecheck:app-store-packages` (non-blocking) → `pnpm run lint` → 테스트 순이며, 위 로컬 검증이 동일 경로를 모두 통과했다.

---

## 6. 완료 기준 대조

| WO 기준 | 결과 |
|---------|------|
| lucide-react ambient 선언 전수 확인 | ✅ 4건 식별 (WO 가 지목한 admin-dashboard·shortcodes 외 루트 `types/` 1건 추가 발견) |
| 불필요한 shim 제거 | ✅ 4 → 0 |
| 드러나는 실제 타입 오류 7건 수정 | ✅ 정확히 7건, 전부 수정 |
| 런타임 UI·아이콘 선택 동작 유지 | ✅ 제거된 import 는 모두 미사용, 나머지는 타입 표기·속성명 변경 |
| 관련 앱 typecheck·test·build 및 CI 검증 | ✅ §5 |
| 기능·디자인 변경 금지 | ✅ 준수 |
| lucide-react 버전 변경 금지 | ✅ 미변경 (`^0.523.0` 유지) |
| 새 광범위 shim 추가 금지 | ✅ 추가 0 |
| 중지 조건 (오류 7건 초과 / 파일 충돌) | 해당 없음 — 오류는 정확히 7건, 작업 시작 시 worktree clean |

---

## 7. 하지 않은 것

- `apps/admin-dashboard/src/global.d.ts` 의 `declare module '@heroicons/react/24/outline';` — lucide 와 무관한 별개 shim. 본 WO 범위 외로 유지
- `packages/operator-core-ui` 의 `ImportMeta.env` 오류 1건 — 사용자 지시대로 본 WO 와 분리
- lucide-react 버전 업그레이드 / 아이콘 교체 / 디자인 조정
