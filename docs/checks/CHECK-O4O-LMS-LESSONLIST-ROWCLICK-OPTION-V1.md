# CHECK-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1

> **작업명:** WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1
> **유형:** `@o4o/lms-ui` `LessonList` 컴포넌트 기능 보강 — full-row navigation 옵션 추가 (서비스 화면 미적용)
> **결과: PASS** — `rowClickMode?: 'action' | 'row'` 추가(기본 `'action'`, backward-compatible). row 모드: href→`<a>`, 없으면 onLessonClick→`<button>`(네이티브 키보드), locked 비클릭(aria-disabled), current 강조(aria-current), hover state. lms-ui typecheck 0 / web-kpa-society typecheck 0. service 화면 미변경, package.json/lock 무변경.
> **선행:** `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`(`7020e2c4c`) · `WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1` · `WO-O4O-LMS-KCOSMETICS-ADOPTION-V1` · `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`(`a9e4bfcc6`)
> **작성일:** 2026-06-13 · 기준 HEAD `dc2153b67`

---

## 1. 작업 목적

`@o4o/lms-ui` `LessonList` 에 full-row navigation 옵션을 추가해, 후속 KPA/GP/KCos fuller adoption 에서 **레슨 사이드바(행 전체 클릭/링크 패턴)** 를 공통 컴포넌트로 수렴할 수 있는 기반을 마련한다. `@o4o/lms-ui` 내부 기능 보강이며 서비스 화면 대규모 교체는 하지 않는다.

## 2. 선행 adoption 에서 LessonList 가 보류된 이유

GP·KCos adoption(및 KPA reference) 시 `LessonList` 가 적용되지 못한 이유:
- KPA/GP/KCos 레슨 사이드바는 **행 전체가 `<Link>` 또는 클릭 영역**(row-click)인데,
- 기존 `LessonList` 는 우측 **trailing "보기" 액션** 중심이라 기존 서비스 UX(전체 행 클릭)와 불일치.
- → adoption 들에서 LessonList 는 "UX semantics 불일치"로 deferred 처리됨(각 CHECK §5).

본 WO 가 그 단일 차단 사유(full-row 미지원)를 해소한다.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/lms-ui/src/components/LessonList.tsx` | `rowClickMode` prop 추가 + 내부 `LessonRow` 서브컴포넌트(hover/접근성) 추출 |
| `docs/checks/CHECK-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1.md` | 본 문서 |

**무변경:** `types.ts`(기존 `LessonItemView` 의 locked/current/completed/isPreview/kind/order/durationMinutes 로 충분), `index.ts`(export 변경 불요 — prop 추가만), package.json/pnpm-lock, 서비스 화면, backend, Neture.

## 4. 추가한 props / 옵션

```ts
rowClickMode?: 'action' | 'row';  // 기본 'action'
```

- **`'action'`(기본):** 우측 trailing "보기" 링크/버튼 — **기존 동작 그대로**(backward-compatible).
- **`'row'`:** 행 전체가 클릭/링크. trailing 액션은 렌더하지 않음(행 자체가 액션).

기존 props(`lessons`, `hrefFor`, `onLessonClick`, `accent`, `openLabel`, `style`)는 변경 없음.

## 5. backward compatibility 확인

- 기본값 `'action'` → 기존 소비처 호출 시그니처·렌더 동작 불변.
- 현재 `LessonList` 를 소비하는 서비스는 **0건**(grep) → live 회귀면 없음. 그래도 API shape 는 보존(순수 추가 prop).
- `web-kpa-society`(lms-ui 의 다른 컴포넌트 소비처) typecheck 0 → 패키지 변경이 소비처 빌드에 영향 없음.

## 6. row mode 동작 기준

| lesson 상태 | row mode 렌더 | 클릭 |
|---|---|---|
| accessible + href | `<a href>` 전체 행 | 링크 이동 |
| accessible + onLessonClick(href 없음) | `<button>` 전체 행 | callback |
| locked(`lesson.locked`) | 비클릭 `<div aria-disabled>` | 없음 |
| current(`lesson.current`) | 배경 강조 + `aria-current="true"` | (클릭 가능 시 동작) |
| 둘 다 없음(href·onLessonClick 부재) | 비클릭 `<div>` | 없음 |

- hover: row-clickable 행에 `onMouseEnter/Leave` state 로 배경 강조(inline-style 한계 회피 위해 `LessonRow` 서브컴포넌트로 state 보유).
- trailing 액션은 row mode 에서 **렌더 안 함**(행 자체가 액션) → `<a>`/`<button>` 내부 중첩 interactive 없음.

## 7. href / onLessonClick 처리 기준

- **href 우선:** `hrefFor(lesson)` 가 값을 반환하면 `<a>`(실제 링크 — 네이티브 키보드/새 탭/접근성).
- **onLessonClick:** href 없을 때 `<button>`(네이티브 Enter/Space). 인라인-player 선택형(GP CourseDetail 같은) 패턴에 적합.
- locked 레슨: href 계산 자체를 skip(`!lesson.locked ? hrefFor(...) : undefined`) + onLessonClick 미연결 → 클릭 불가.

## 8. locked / current / completed 처리 기준

- **locked:** 비클릭(aria-disabled), 액션/링크 없음.
- **current:** 배경(`#f8fafc`) + 제목 bold + `aria-current="true"`.
- **completed:** 번호 자리에 ✓(accent 배경) — 기존 동작 유지.

## 9. 접근성 고려 결과

- href → `<a>`(시맨틱 링크, 키보드/포커스 네이티브).
- callback → `<button type="button">`(Enter/Space 네이티브, 별도 keydown 핸들러 불요).
- locked → `aria-disabled={true}` 비클릭 div.
- current → `aria-current="true"`.
- **중첩 interactive 방지:** row mode 는 trailing 액션을 렌더하지 않으므로 `<a>`/`<button>` 안에 또 다른 link/button 없음.
- 한계: hover/focus 시각 스타일은 inline-style + state 로 hover 만 처리(focus-visible outline 은 브라우저 기본). 정교한 focus ring 은 후속 가능.

## 10. KPA / GP / KCos 후속 adoption 가능성

- **KPA `LmsCourseDetailPage`**(레슨 목록, "보기" 링크형): `rowClickMode='action'`(기본) 또는 `'row'` 선택 가능.
- **GP `CourseDetailPage`**(inline-player 선택형, onClick=handleSelectLesson): `rowClickMode='row'` + `onLessonClick` → 행 전체 선택.
- **GP/KCos `LmsLessonPage` 사이드바**(full-row `<Link>`): `rowClickMode='row'` + `hrefFor` → `<a>` 행 전체. ← 가장 직접적인 수렴 대상.
- 실제 적용은 각 fuller adoption WO(§13)에서 view model mapper + `rowClickMode='row'` 주입으로 진행.

## 11. Neture 제외 확인

- 본 WO 는 `@o4o/lms-ui` 내부만 변경 — Neture 파일 0, package.json 0, route/menu/import 0. Neture 제외 경계(`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`) 불변.

## 12. 검증 결과

- **TypeScript:** `@o4o/lms-ui` `tsc --noEmit` **0**, `web-kpa-society` `tsc --noEmit` **0**(lms-ui/LessonList 관련 0). GP/KCos 는 LessonList 미소비 + lms-ui 표준 해상이라 영향 없음(패키지 standalone 0 으로 보장).
- **정적:** 기본값 `'action'` backward-compatible. row mode href→`<a>`/callback→`<button>`/locked 비클릭/current·completed 유지. lms-ui 내부 service-specific 코드·API client import·Neture 참조·reward/결제/YouTube 0(컴포넌트는 presentational, 변경 범위 내 신규 없음).
- **무변경:** 서비스 화면, backend, package.json/pnpm-lock, Neture.
- **browser smoke:** 미수행(컴포넌트 옵션 보강 — typecheck·정적 중심).

## 13. 남은 후속 작업

1. **`WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`** — KPA 목록/레슨에서 LessonList(+ CourseCard/List/ProgressBar) 활용 확대.
2. **`WO-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1`** — GP 레슨 사이드바에 `rowClickMode='row'` LessonList 적용.
3. **`WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1`** — KCos 레슨 사이드바에 `rowClickMode='row'` LessonList 적용.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
5. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.

## 14. 완료 판정

**PASS.** `LessonList` 에 `rowClickMode='row'` full-row navigation 옵션 추가(기본 `'action'` backward-compatible). href→`<a>`/callback→`<button>` 네이티브 접근성, locked 비클릭, current/completed 유지, hover state. lms-ui·web-kpa-society typecheck 0. 서비스 화면·package·backend·Neture 무변경. 3서비스 레슨 사이드바 수렴의 단일 차단 사유 해소 → fuller adoption 준비 완료.
