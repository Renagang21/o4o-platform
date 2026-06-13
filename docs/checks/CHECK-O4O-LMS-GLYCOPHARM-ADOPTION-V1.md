# CHECK-O4O-LMS-GLYCOPHARM-ADOPTION-V1

> **작업명:** WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1
> **유형:** GlycoPharm 사용자 LMS 화면에 `@o4o/lms-ui` 공통 presentational UI 1차 적용 (frontend-only)
> **결과: PASS** — GlycoPharm `CourseDetailPage` + `LmsLessonPage` 가 공통 `CourseProgressBar`(accent `#16a34a`) 소비 시작. 기존 LMS 기능·route·API client 유지. YouTube/LIVE·고정 reward 문구·결제·reward UI 재도입 없음. Neture/KPA/KCos 미수정. web-glycopharm typecheck: 내 편집 파일 0(잔존 2건은 타 세션 forum WIP).
> **중요 원칙:** "KPA 이식"이 아니라 GP 기존 풀 구현 위에 공통 UI 를 일부 소비시키는 adoption. 무리한 전체 교체 금지.
> **선행:** `IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1` · `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1` · `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`(`7020e2c4c`)
> **작성일:** 2026-06-13 · 기준 HEAD `a8b434601`

---

## 1. 작업 목적

GlycoPharm 사용자 LMS 화면에 신규 `@o4o/lms-ui` 를 1차 적용한다. GP 는 이미 풀 LMS 구현 보유 → 기존 기능 유지 + 일부 화면을 공통 presentational UI 로 수렴. API 호출은 기존 GP wrapper 유지, `@o4o/lms-ui` 는 presentational only, accent `#16a34a`. YouTube/LIVE·결제·reward wallet 재도입 금지. Neture 미수정.

## 2. 선행 요약

- `@o4o/lms-ui`(source-direct, themeable) 9개 컴포넌트 추출 완료(`7020e2c4c`), KPA 가 CourseVisibilityBadge+NoPaymentNotice 소비.
- GP 정책 drift(YouTube 임베드·고정 reward 문구)는 `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1` 에서 선해소 → 본 WO 에서 안전하게 adoption.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/package.json` | `@o4o/lms-ui: workspace:*` dep 추가 |
| `services/web-glycopharm/src/pages/education/CourseDetailPage.tsx` | 진도 블록(Tailwind) → `CourseProgressBar`(accent `#16a34a`) |
| `services/web-glycopharm/src/pages/education/LmsLessonPage.tsx` | 사이드바 진도 블록(inline-style) → `CourseProgressBar`(accent `C.primary`=`#16a34a`, compact) |
| `services/web-glycopharm/Dockerfile` | `@o4o/lms-ui` package.json + source COPY 2줄 추가(빌드 깨짐 방지 — §7) |
| `pnpm-lock.yaml` | web-glycopharm 에 `@o4o/lms-ui` link |
| `docs/checks/CHECK-O4O-LMS-GLYCOPHARM-ADOPTION-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, KPA, K-Cosmetics, Neture, reward/budget, 결제, GP AI 과제 채점, GP route/menu.

## 4. 적용한 `@o4o/lms-ui` 컴포넌트

- **`CourseProgressBar`** (2곳):
  - `CourseDetailPage`(Tailwind): 수강 중 진도 막대 + "n/m 레슨 완료" → 공통 컴포넌트(percent/completedCount/totalCount, accent `#16a34a`). 완료(수료) 배지 분기는 GP 기존 유지.
  - `LmsLessonPage`(inline-style 사이드바): 진도 막대 + "진도율 X%(n/m)" → 공통 컴포넌트(compact, accent `C.primary`).
- view model mapper: `CourseProgressBar` 는 numeric props(percent/counts)만 받으므로 별도 타입 매퍼 불필요 — GP enrollment.progress / completedLessonIds.length / lessons.length 를 직접 주입.

## 5. 적용 보류한 컴포넌트와 이유 (GP 구조 차이)

| 컴포넌트 | 보류 사유 |
|---|---|
| `CourseVisibilityBadge` | GP 학습자 타입 `LmsCourse` 에 `visibility` 필드 없음(instructor 측에만 존재) → 학습자 화면에서 매핑 불가 |
| `CourseStatusBadge` | GP 학습자 상세에 상태 배지 노출 지점 없음(목록은 published 필터) |
| `NoPaymentNotice` | GP `LmsCourse` 에 isPaid/price 없음(전부 무료) → 표시할 결제 안내 지점 없음. 없는 곳에 신규 문구 추가는 scope 외 |
| `CourseCard`/`CourseList` | GP `EducationPage` 가 공통 `LmsHubTemplate`(@o4o/shared-space-ui) 에 완전 위임 → lms-ui 카드와 중복/충돌. (목록 공통화는 LmsHubTemplate 축의 별도 문제) |
| `LessonList` | GP `CourseDetailPage` 레슨목록은 **inline-player 선택형**(클릭→하단 재생), `LmsLessonPage` 사이드바는 **full-row `<Link>`**. lms-ui `LessonList` 는 trailing "보기" 링크 패턴 → 두 GP 패턴 모두와 UX semantics 불일치. 강제 시 회귀 → 보류(후속에서 component row-click 옵션 보강 후 재검토) |
| `EnrollmentButton` | GP enroll/수강중 UI 가 Tailwind 인라인 + "수강중" 상태 표현이 상이 → 1차 보류 |
| `LessonPlayerShell` | GP 플레이어가 quiz/assignment/**AI 과제 채점**/article 렌더와 강결합 → shell 교체 위험. AI 채점 보존 위해 보류 |

## 6. 유지한 GlycoPharm 특수 기능

- **AI 과제 채점**(LmsLessonPage) — 미변경.
- self `<video>` 렌더(YouTube 미임베드, drift 정합 상태 유지).
- GP theme/accent(`#16a34a`), GP route(`/lms/course/:id`, `/lms/course/:courseId/lesson/:lessonId`), 메뉴 구조 — 미변경.
- 수료(완료) 배지, 퀴즈 패널, enroll 흐름 — 미변경.

## 7. Docker 빌드 정합 (중요)

서비스 Dockerfile 들은 워크스페이스 패키지를 **개별 명시 COPY**(와일드카드 아님)한다. GP 가 `@o4o/lms-ui` 를 소비하므로 `services/web-glycopharm/Dockerfile` 에 2줄 추가:
- `COPY packages/lms-ui/package.json ./packages/lms-ui/` (install 전 블록)
- `COPY packages/lms-ui/ ./packages/lms-ui/` (source 블록)
- lms-ui 는 **source-direct(빌드 단계 불필요)** → `RUN pnpm --filter ... build` 추가 안 함(store-ui-core 와 동일).

> 직전 `7020e2c4c`(KPA lms-ui 추가)가 같은 이유로 **kpa-society-web Docker 빌드를 깨뜨림**(`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`) → 별도 핫픽스 `e4a9edef1`(kpa Dockerfile COPY 2줄)로 복구. 본 WO 는 GP Dockerfile 을 **같은 커밋에서** 수정해 동일 회귀를 방지.

## 8. YouTube/LIVE 재도입 없음 확인

- CourseProgressBar 만 적용 — 동영상/플레이어 로직 미변경. drift 정합 상태(self video only, YouTube 안내) 유지.
- grep: GP LMS education 경로에 YouTube iframe 자동 임베드 0(이전 WO 상태 유지).

## 9. 고정 reward 문구 / 결제 / reward UI 미도입 확인

- MyCreditsPage(고정 `+10/+20/+50` 제거 상태) 미변경 — 본 WO 에서 reward 문구 재추가 0.
- 결제/checkout 추가 0. rewardPolicy/proposal/지갑/budget UI 0.

## 10. Neture / KPA / KCos 미수정 확인

- `services/web-neture` 파일 0, package.json 에 `@o4o/lms-ui` 미추가, LMS route/menu/import 0.
- KPA(`web-kpa-society`) 소스 미변경(단 직전 핫픽스 `e4a9edef1` 은 kpa Dockerfile만 — 본 WO 무관, 별도 커밋).
- K-Cosmetics 미수정.

## 11. 검증 결과

- **TypeScript:** `web-glycopharm` `tsc -b --noEmit` — 내 편집 파일(CourseDetailPage/LmsLessonPage) **0 errors**, `@o4o/lms-ui` 해상 정상. 잔존 2건은 전부 `src/pages/forum/ForumPage.tsx`(타 세션 forum-detail-primitives WIP) — 본 WO 무관·미접촉.
- **grep:** `@o4o/lms-ui` GP 소비 2개 import 확인. YouTube/iframe 자동 임베드 0, `+10/+20/+50` 0, checkout/payment 0, rewardPolicy 0(GP LMS 경로).
- **Docker:** GP Dockerfile lms-ui COPY 2줄 반영. source-direct → build 단계 불요.
- **무변경:** backend/DB/Neture/KPA소스/KCos.
- **browser smoke:** 미수행 — 렌더 변경 중심. 배포 후 GP 강의 상세·레슨 화면 진도 렌더 + YouTube 미노출 확인 권장.

## 12. 남은 후속 작업

1. **`WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`** — K-Cosmetics 에 `@o4o/lms-ui` 적용(accent `#db2777`). KCos Dockerfile 도 lms-ui COPY 2줄 필요.
2. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS route/menu/package 소비처 부재 확인.
3. **`WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`** — KPA 목록/레슨에서 미사용 공통 컴포넌트(CourseCard/List, LessonList, ProgressBar, EnrollmentButton, LessonPlayerShell) 활용 확대.
4. **`WO-O4O-LMS-UI-LESSONLIST-ROWCLICK-OPTION-V1`**(신규 제안) — `LessonList` 에 full-row 네비게이션 옵션 추가 후 GP/KPA 사이드바 적용 재검토(§5 보류 해소).
5. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
6. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.

## 13. 완료 판정

**PASS.** GlycoPharm `CourseDetailPage` + `LmsLessonPage` 가 공통 `CourseProgressBar`(accent `#16a34a`) 소비 시작 — GP 기존 기능·route·API·AI 채점 보존, YouTube/LIVE·고정 reward·결제·reward UI 재도입 0, Neture/KPA/KCos 미수정. GP 구조 차이로 다른 컴포넌트는 사유와 함께 보류(§5). Docker COPY 정합 동봉. typecheck 내 파일 0.
