# CHECK-O4O-LMS-COMMON-UI-EXTRACTION-V1

> **작업명:** WO-O4O-LMS-COMMON-UI-EXTRACTION-V1
> **유형:** LMS 사용자 화면 공통 presentational UI 1차 추출 — 신규 `@o4o/lms-ui` 패키지 생성 + KPA(reference impl) 일부 소비 시작 (frontend-only)
> **결과: PASS** — 신규 `@o4o/lms-ui` (pure presentational, source-direct) 패키지에 9개 컴포넌트 + view model 추출. KPA `LmsCourseDetailPage` 가 `CourseVisibilityBadge` + `NoPaymentNotice` 소비 시작. lms-ui typecheck 0 / web-kpa-society typecheck 0. API client·serviceKey·route·YouTube·결제 미포함. Neture 미연결.
> **중요 원칙:** "빈 서비스에 KPA 이식"이 아니라 **3개 병렬 구현을 공통 UI 로 수렴**하는 첫 단계. 1차는 pure UI 중심, GP/KCos 전체 adoption·강사/운영자 화면·reward UI 는 보류.
> **선행:** `IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1` · `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1`(`261f9e1e8`)
> **작성일:** 2026-06-13 · 기준 HEAD `7574e08e1`

---

## 1. 작업 목적

KPA / GlycoPharm / K-Cosmetics 에 병렬 구현된 LMS 사용자 화면의 공통 presentational UI 를 신규 `@o4o/lms-ui` 로 1차 추출한다. backend 는 이미 service-neutral(`/api/v1/lms/*` + `@o4o/lms-client`)이므로 frontend-only. KPA 를 reference impl 로 삼아 일부 화면이 공통 UI 를 소비하기 시작하는 것이 본 WO 의 성공 기준(전체 교체 아님).

## 2. 선행 IR 요약

`IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1`: GP/KCos 는 이미 풀 LMS 구현 보유 → 공통화 = 병렬 구현 수렴. backend service-neutral → frontend-only. 공통화 전 정책 drift(reward 문구·YouTube)는 `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1` 에서 선해소됨 → 본 WO 에서 안전하게 추출.

## 3. 신규 `@o4o/lms-ui` 패키지 구조

- **위치:** `packages/lms-ui`, name `@o4o/lms-ui`.
- **패턴:** `@o4o/store-ui-core` 와 동일한 **source-direct**(`main`/`types` = `./src/index.ts`, **build/dist 없음**). 소비처(vite/tsc)가 src 를 직접 컴파일 → stale-dist 클래스 문제 회피.
- **peerDependencies:** react, react-dom. (icon lib·router 의존 없음 — 결합 최소화.)
- **스타일:** inline style object + `accent`(theme) prop. KPA(inline style)·GP/KCos(Tailwind) 양쪽에서 네이티브 렌더 가능하도록 Tailwind className 비의존.

```
packages/lms-ui/
  package.json        (source-direct, peer react)
  tsconfig.json       (noEmit, strict, noUnusedLocals/Parameters)
  src/
    index.ts          (barrel)
    types.ts          (view models)
    components/
      CourseVisibilityBadge.tsx
      CourseStatusBadge.tsx
      CourseProgressBar.tsx
      NoPaymentNotice.tsx
      EnrollmentButton.tsx
      CourseCard.tsx
      CourseList.tsx
      LessonList.tsx
      LessonPlayerShell.tsx
```

## 4. 추출한 컴포넌트 (9)

| 컴포넌트 | 역할 | 주입 |
|---|---|---|
| `CourseVisibilityBadge` | 공개/회원제 배지 | visibility, labels override |
| `CourseStatusBadge` | 강의 상태(draft/pending/published/rejected/archived) | status, labels override |
| `CourseProgressBar` | 진도율 막대 + n/m 레슨 완료 | percent, counts, accent, compact |
| `NoPaymentNotice` | "O4O 강의 결제 없음" 표준 안내 | paid, variant(inline/plain) |
| `EnrollmentButton` | 수강 상태별 버튼 shell(none→시작하기, pending/rejected/archived 비활성) | state, onEnroll, accent, labels |
| `CourseCard` | 강의 카드(썸네일/제목/요약/메타/배지/진도) | course view, href|onClick, accent, badgeSlot |
| `CourseList` | 카드 grid shell + loading/error/empty + header/filter slot | courses, hrefFor|onCourseClick |
| `LessonList` | 레슨 목록(번호/완료/타입아이콘/미리보기/현재강조/접근링크) | lessons view, hrefFor|onLessonClick |
| `LessonPlayerShell` | 레슨 플레이어 레이아웃 shell(header/content slot/nav/action) — **video renderer 미포함** | title, slots |

**view models(`types.ts`):** `CourseVisibility` / `CourseStatus` / `LessonKind` / `EnrollmentState` / `CourseCardView` / `LessonItemView` / `LmsUiTheme`. 서비스 API 응답 원본 타입에 묶지 않음 — 서비스 wrapper 가 매핑 주입(WO 원칙).

## 5. KPA 적용 파일 (reference impl, 일부 소비)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/package.json` | `@o4o/lms-ui: workspace:*` dep 추가 |
| `services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx` | `CourseVisibilityBadge`(공개/회원제 배지 swap) + `NoPaymentNotice`(유료 강의 안내 표준화) 소비 |
| `pnpm-lock.yaml` | `@o4o/lms-ui` link 등록(+24/-2, 본 패키지 한정) |

- **CourseVisibilityBadge:** 기존 `detailBadge('public'|'members')` 인라인 스팬 → 공통 배지. 승인필요/유료/종료 배지는 기존 유지(범위 제한).
- **NoPaymentNotice:** 유료 강의 접근 안내의 하드코딩 문구 → `<NoPaymentNotice paid variant="plain" />`. 결제 정책 문구 표준화. 승인/회원 안내 분기는 유지.
- **나머지 화면(목록/레슨/강사/운영자)은 무리하게 교체하지 않음** — 성공 기준 "일부 소비 시작" 충족. KPA 목록·레슨 페이지 fuller adoption 및 GP/KCos adoption 은 후속 WO.

## 6. GP/KCos adoption mapping (이번 WO 미적용)

| 서비스 | 매핑 가능 컴포넌트 | accent | 비고 |
|---|---|---|---|
| GlycoPharm | CourseCard/List(EducationPage), CourseVisibilityBadge, NoPaymentNotice, CourseProgressBar, LessonList | `#16a34a` | YouTube/reward drift 선해소됨(261f9e1e8) |
| K-Cosmetics | 동일 | `#db2777` | visibility 노출 보강은 adoption WO |

GP/KCos 는 본 WO 에서 **직접 교체하지 않음**(타입 호환만 확인). adoption 은 `WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1` / `WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`.

## 7. Neture 제외 확인

- `services/web-neture` **파일 미수정**(git status 확인).
- `services/web-neture/package.json` 에 `@o4o/lms-ui` **미추가**.
- Neture route/menu 추가 없음, `@o4o/lms-ui` import 0(grep).
- Neture 는 LMS 대상 아님(IR §8) → 공통 패키지 비소비 유지.

## 8. 정적 검증 (WO §9)

- **`@o4o/lms-ui` purity (grep, src 전체):**
  - `fetch(` / `axios` / `@o4o/lms-client` import **0**(실코드). YouTube/iframe/checkout/payment/rewardPolicy 매치는 전부 **주석·컴포넌트명(NoPaymentNotice)·금지 명시 문구**뿐, 실로직 0.
  - serviceKey 내부 결정 **0**, route path 하드코딩 **0**(href/onClick 주입).
  - Neture 참조 **0**.
- **reward UI 신규 생성 0** — rewardPolicy/proposal UI·지갑·budget 미포함.
- **결제/checkout 0**, **YouTube/LIVE 0**.
- KPA 가 `@o4o/lms-ui` 소비 확인(import grep 1건).

## 9. 검증 결과

- **TypeScript:**
  - `@o4o/lms-ui` `tsc --noEmit` **0 errors**(strict + noUnusedLocals/Parameters).
  - `web-kpa-society` `tsc --noEmit` **0 errors**(LmsCourseDetailPage·lms-ui 해상 포함 전체 clean). 워크스페이스 심볼릭 링크 정상 해상.
- **pnpm:** `pnpm install` 로 `@o4o/lms-ui` 워크스페이스 링크 등록. `pnpm-lock.yaml` 변경은 본 패키지 link 한정(+24/-2) — 타 세션 deps 미혼입 확인.
- **무변경:** backend, DB/migration, KPA 외 서비스 화면, Neture, reward/결제/YouTube.
- **browser smoke:** 미수행 — 렌더 변경 중심, 실데이터 write 회피. 배포 후 KPA `/lms/course/:id` 에서 공개/회원제 배지·결제없음 안내 렌더 확인 권장.

## 10. 변경 파일 (commit)

| 파일 | |
|---|---|
| `packages/lms-ui/**` (신규: package.json, tsconfig.json, src/index.ts, src/types.ts, components/×9) | 신규 패키지 |
| `services/web-kpa-society/package.json` | dep 추가 |
| `services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx` | 공통 UI 소비 |
| `pnpm-lock.yaml` | lms-ui link |
| `docs/checks/CHECK-O4O-LMS-COMMON-UI-EXTRACTION-V1.md` | 본 문서 |

**무변경:** backend, migration, GP/KCos 화면, Neture, reward/budget, certificate, 강사/운영자 관리 화면, 결제.

## 11. 남은 후속 작업

1. **`WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1`** — GlycoPharm 에 `@o4o/lms-ui` 적용(accent `#16a34a`).
2. **`WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`** — K-Cosmetics 에 적용(accent `#db2777`) + visibility 노출 보강.
3. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS route/menu/package 소비처 부재 확인.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선. 강사 reward 지갑/충전/배정/처리중/ledger.
5. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계 조사.
6. *(KPA 내부)* KPA 목록(`LmsCoursesPage`)·레슨(`LmsLessonPage`) fuller adoption — CourseCard/List·LessonList·ProgressBar·LessonPlayerShell·EnrollmentButton 소비 확대(현재 미사용 컴포넌트 활용).

## 12. 완료 판정

**PASS.** 신규 `@o4o/lms-ui`(pure presentational, source-direct, themeable) 9개 컴포넌트 + view model 추출. KPA reference impl 이 `CourseVisibilityBadge` + `NoPaymentNotice` 소비 시작. API client·serviceKey·route·YouTube·결제·reward UI 미포함, Neture 미연결. lms-ui·web-kpa-society typecheck 0. GP/KCos·강사/운영자 화면·reward·전체 교체는 후속 WO 로 분리.
