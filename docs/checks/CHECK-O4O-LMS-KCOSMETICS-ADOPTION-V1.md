# CHECK-O4O-LMS-KCOSMETICS-ADOPTION-V1

> **작업명:** WO-O4O-LMS-KCOSMETICS-ADOPTION-V1
> **유형:** K-Cosmetics 사용자 LMS 화면에 `@o4o/lms-ui` 공통 presentational UI 1차 적용 (frontend-only)
> **결과: PASS** — KCos `LmsCourseDetailPage` + `LmsLessonPage` 가 공통 `CourseProgressBar`(accent `#db2777`) 소비 시작. KCos Dockerfile 에 `@o4o/lms-ui` source-direct COPY 2줄 동봉. 기존 기능·route·API 유지. YouTube/LIVE·고정 reward·결제·reward UI 재도입 0. Neture/KPA/GP 미수정. web-k-cosmetics typecheck 0.
> **선행:** `IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1` · `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1` · `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`(`7020e2c4c`) · `WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1`(`2f2122559`) · KPA Docker hotfix `e4a9edef1`
> **작성일:** 2026-06-13 · 기준 HEAD `ea4068f77`

---

## 1. 작업 목적

K-Cosmetics 사용자 LMS 화면에 `@o4o/lms-ui` 1차 적용. KCos 는 이미 풀 LMS 구현 보유 → 기존 기능 유지 + 일부 화면 공통 UI 수렴. API 는 기존 KCos wrapper 유지, lms-ui 는 presentational only, accent `#db2777`. **KCos Dockerfile 에 lms-ui COPY 동봉**(빌드 깨짐 방지). reward/결제/YouTube/LIVE 재도입 금지, Neture 미수정.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/package.json` | `@o4o/lms-ui: workspace:*` dep 추가 |
| `services/web-k-cosmetics/Dockerfile` | `@o4o/lms-ui` package.json + source COPY 2줄(source-direct, build 단계 없음) |
| `services/web-k-cosmetics/src/pages/lms/LmsCourseDetailPage.tsx` | 수강 중 진도 블록(inline-style) → `CourseProgressBar`(accent `C.primary`=`#db2777`) |
| `services/web-k-cosmetics/src/pages/lms/LmsLessonPage.tsx` | 사이드바 진도 블록 → `CourseProgressBar`(compact, accent `C.primary`) |
| `pnpm-lock.yaml` | web-k-cosmetics 에 `@o4o/lms-ui` link |
| `docs/checks/CHECK-O4O-LMS-KCOSMETICS-ADOPTION-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, KPA, GlycoPharm, Neture, reward/budget, 결제, KCos route/menu.

## 3. 적용한 `@o4o/lms-ui` 컴포넌트

- **`CourseProgressBar`** (2곳, accent `#db2777`):
  - `LmsCourseDetailPage`: 수강 중(in-progress) 진도 막대+진도율 → 공통 컴포넌트(percent + completedCount/totalCount). archived 분기·완료(수료) 분기는 KCos 기존 유지.
  - `LmsLessonPage`: 사이드바 진도 막대+"진도율 X%(n/m)" → 공통 컴포넌트(compact).
- mapper: `CourseProgressBar` 는 numeric props 만 받으므로 별도 타입 매퍼 불필요(enrollment.progress / completedLessonIds.length / lessons.length 직접 주입).
- **accent 정책:** WO 지시대로 KCos 브랜드 `#db2777` 주입. 기존 progress fill 은 `C.accentGreen`(green)이었으나 브랜드(pink)로 정렬 — 시각적 normalization(브랜드 일치).

## 4. K-Cosmetics visibility 처리 결과

- KCos 학습자 타입 `LmsCourse` 에 **`visibility` 필드 없음**(상태는 `status` 문자열, 목록은 published 필터). → `CourseVisibilityBadge` 적용 보류(억지 표시 안 함, WO §6 준수).
- visibility 정책/DB/backend **무변경**. 노출 보강은 후속(데이터에 visibility 안정 제공 시).

## 5. 적용 보류한 컴포넌트와 이유

| 컴포넌트 | 보류 사유 |
|---|---|
| `CourseVisibilityBadge` | KCos `LmsCourse` 에 visibility 필드 없음(§4) |
| `CourseStatusBadge` | 학습자 상세에 상태 배지 노출 지점 없음(목록 published 필터) |
| `NoPaymentNotice` | KCos `LmsCourse` 에 isPaid/price 없음(전부 무료) → 표시할 결제 안내 지점 없음. 신규 문구 추가는 scope 외 |
| `CourseCard`/`CourseList` | KCos `EducationPage` 가 공통 `LmsHubTemplate`(@o4o/shared-space-ui)에 위임 → lms-ui 카드와 중복 |
| `LessonList` | KCos 레슨 목록(상세=선택형, 레슨페이지 사이드바=full-row Link)이 lms-ui `LessonList`(trailing "보기" 링크) 와 UX semantics 불일치 → 보류(후속 row-click 옵션 후 재검토) |
| `LessonPlayerShell` | KCos 플레이어가 quiz/assignment/AI 채점/article 렌더와 강결합 → shell 교체 위험 |

> GP adoption(§5)과 동일 사유 — GP/KCos 가 구조적으로 유사(둘 다 KPA 구조 기준·inline-style·LmsHubTemplate 목록·AI 채점). 공통화 surface 가 동일하게 좁다.

## 6. Dockerfile `lms-ui` COPY 반영 결과

`services/web-k-cosmetics/Dockerfile`:
- `COPY packages/lms-ui/package.json ./packages/lms-ui/` (pnpm install 전 블록)
- `COPY packages/lms-ui/ ./packages/lms-ui/` (source 블록)
- **source-direct 이므로 `RUN pnpm --filter ... build` 추가 없음**(store-ui-core 동일).

> 직전 KPA(`7020e2c4c`)가 Dockerfile 미수정으로 Cloud Build `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` 깨짐 → 핫픽스 `e4a9edef1`. 본 WO 는 **dep 추가와 같은 커밋에서 Dockerfile COPY 동봉**해 동일 회귀를 사전 차단. grep 확인: KCos Dockerfile `packages/lms-ui` 매치 2건.

## 7. YouTube/LIVE · 고정 reward · 결제 · reward UI 미도입 확인

- CourseProgressBar 만 적용 — 동영상/플레이어 로직 미변경(self video, YouTube 미임베드 — drift 정합 상태 유지).
- grep(KCos `src/pages/lms/`): youtube/youtu.be/iframe/checkout/payment/`+10 C`/`+20 C`/`+50 C`/rewardPolicy **0**.
- MyCreditsPage(고정 스케줄 제거 상태) 미변경. reward 지갑/budget/proposal UI 0.

## 8. Neture / KPA / GlycoPharm 미수정 확인

- `services/web-neture` 파일 0, package.json 에 `@o4o/lms-ui` 미추가, LMS route/menu/import 0.
- KPA·GlycoPharm 소스 미변경(각 직전 커밋에서 처리됨).

## 9. 검증 결과

- **TypeScript:** `web-k-cosmetics` `tsc --noEmit` **0 errors**(편집 파일·lms-ui 해상 포함 전체 clean).
- **grep:** KCos lms-ui 소비 2 import 확인. Dockerfile lms-ui COPY 2건. reintro(YouTube/reward/결제) 0.
- **pnpm:** `@o4o/lms-ui` link 등록(pnpm-lock). 
- **무변경:** backend/DB/Neture/KPA/GP.
- **browser smoke:** 미수행 — 렌더 변경 중심. 배포 후 KCos 강의 상세·레슨 화면 진도 렌더 + YouTube 미노출 확인 권장.

## 10. 남은 후속 작업

1. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS route/menu/package 소비처 부재 최종 확인.
2. **`WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`** — KPA 목록/레슨에서 미사용 공통 컴포넌트 활용 확대.
3. **`WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1`** — `LessonList` full-row navigation 옵션 추가 → GP/KPA/KCos 사이드바 LessonList 적용 재검토(§5 보류 해소).
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
5. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.

## 11. 완료 판정

**PASS.** K-Cosmetics `LmsCourseDetailPage` + `LmsLessonPage` 가 공통 `CourseProgressBar`(accent `#db2777`) 소비 시작 — 기존 기능·route·API 보존, KCos Dockerfile lms-ui COPY 동봉(빌드 회귀 사전 차단), YouTube/LIVE·고정 reward·결제·reward UI 재도입 0, Neture/KPA/GP 미수정. 구조 차이 컴포넌트는 사유와 함께 보류(§5). typecheck 0.

> **3서비스 adoption 완료:** KPA(reference: VisibilityBadge+NoPaymentNotice) / GlycoPharm(ProgressBar ×2) / K-Cosmetics(ProgressBar ×2). 공통 `@o4o/lms-ui` 가 3서비스에서 소비되기 시작. 더 깊은 수렴(LessonList row-click, CourseCard via LmsHubTemplate 정렬, 강사/운영자 화면)은 후속.
