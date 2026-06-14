# CHECK-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1

> **작업명:** WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1
> **유형:** `LmsHubTemplate` hardcoded blue accent(`#2563eb`)를 service config 기반 accent 로 정리 (frontend-only, 색상 config)
> **결과: PASS** — `LmsHubConfig.accent?` 추가(기본 `#2563eb`). 템플릿의 강의명 링크 / 기본 수강 CTA / 선택 체크박스에 accent 적용. KPA `#2563EB` / GlycoPharm `#16a34a` / K-Cosmetics `#db2777` 명시 주입. 기능·구조 불변, backward-compatible. 3서비스 typecheck 0. shared-space-ui→lms-ui import 0(Neture guard 유지).
> **선행:** `WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1`(`cddfdd3ea`) — 3서비스 /lms 가 LmsHubTemplate 으로 수렴.
> **작성일:** 2026-06-13 · 기준 HEAD `face32609`

---

## 1. 작업 목적

3서비스(KPA/GP/KCos) `/lms` 강의 목록 hub 가 `LmsHubTemplate` 으로 수렴됐으나, 템플릿 내부에 KPA blue(`#2563eb`)가 hardcoded 되어 GP/KCos 브랜드색과 어긋났다. accent 를 service config 기반으로 정리해 각 서비스 브랜드색으로 렌더한다. 기능 변경 아님 — 색상 config 마무리 정리.

## 2. 선행 hub 수렴 상태

KPA/GP/KCos `/lms` 모두 `LmsHubTemplate`(shared-space-ui, BaseTable 테이블) 소비. LessonList(row)·CourseProgressBar 도 3서비스 적용 완료. Neture LMS 제외 유지.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/LmsHubTemplate.tsx` | `LmsHubConfig.accent?: string` 추가(기본 `#2563eb`). `const accent = config.accent ?? '#2563eb'`. 강의명 링크 color / 기본 수강 CTA background / 선택 체크박스 `accentColor` 에 accent 적용. columns useMemo deps 에 accent 추가 |
| `services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx` | config 에 `accent: '#2563EB'` |
| `services/web-glycopharm/src/pages/education/EducationPage.tsx` | glycoConfig 에 `accent: '#16a34a'` |
| `services/web-k-cosmetics/src/pages/lms/EducationPage.tsx` | config 에 `accent: '#db2777'` |
| `docs/checks/CHECK-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, Neture, `@o4o/lms-ui`, package.json/pnpm-lock, Dockerfile. *(tree 의 타 세션 변경 파일 미접촉·미스테이징.)*

## 4. LmsHubTemplate accent 변경 내용

- **config 계약:** `LmsHubConfig.accent?: string` (optional). 미지정 시 `'#2563eb'` fallback → **backward-compatible**(기존 GP/KCos 가 명시 안 했어도 깨지지 않음; 본 WO 에서 3서비스 모두 명시 주입).
- **적용 지점(서비스 accent 로 보이는 곳만):**
  - 강의명 링크 색(`titleLink` → `{ ...titleLink, color: accent }`).
  - 기본 "수강하기" CTA 배경(`enrollBtn` → `{ ...enrollBtn, backgroundColor: accent }`). *(KPA 는 renderCta 사용 → 기본 CTA 미노출, KPA CTA 색은 자체 유지.)*
  - 선택 체크박스 `accentColor`(기존 Tailwind `accent-blue-600` className → inline `accentColor: accent`).
- **유지(중립 UI 색):** table border, muted text, neutral bg, status 배지(success/draft/archived tone), visibility 배지(공개=green/회원제=purple/유료=red — 의미색), empty state — accent 정리 대상 아님.
- columns 가 useMemo([config, loadCourses, accent]) 로 accent 변경 반영.

## 5. 서비스별 accent 주입 결과

| 서비스 | accent | wrapper |
|---|---|---|
| KPA-Society | `#2563EB` (blue) | `LmsCoursesPage` config(useMemo) |
| GlycoPharm | `#16a34a` (green) | `EducationPage` glycoConfig |
| K-Cosmetics | `#db2777` (pink) | `EducationPage` config |

## 6. hardcoded blue 정리 결과

- grep `#2563eb`/`accent-blue` in LmsHubTemplate: 잔여 = (a) config.accent 미지정 시 **기본 fallback** `'#2563eb'`(line 117) + 문서 주석, (b) `colStyles.titleLink`/`enrollBtn` 의 base default `#2563eb`(render 에서 항상 `accent` 로 override → 무해한 기본값). accent-blue className 0.
- 즉 실제 렌더 색은 전부 config.accent 경유. 기본값(fallback)만 blue 로 보존(backward-compat).

## 7. GP/KCos/KPA 기능 영향

- accent 외 구조/기능 **불변**. GP/KCos `EducationPage` 는 config 에 accent 한 줄만 추가(fetchCourses/courseDetailPath/hero 동일). KPA renderCta/renderRowActions/visibility 매핑 유지.
- KPA store library takeaway 재도입 0(grep). reward/결제/YouTube 재도입 0.

## 8. Neture / 의존 경계

- `shared-space-ui` → `@o4o/lms-ui` import **0**(grep) → Neture transitive LMS 소비 위험 없음. Neture 미수정.
- `@o4o/lms-ui CourseCard/List` 미적용(본 WO 무관).
- package.json/pnpm-lock/Dockerfile **무변경** — accent 는 코드 내 prop 일 뿐 신규 의존 없음.

## 9. 검증 결과

- **TypeScript:** `web-kpa-society` **0**, `web-glycopharm` **0**(본 변경 관련), `web-k-cosmetics` **0**. shared-space-ui 는 source-direct(소비처 컴파일 검증). `accentColor` 는 유효 CSSProperties.
- **grep:** LmsHubTemplate accent-blue className 0, 실렌더 색 config 경유. 3서비스 wrapper accent 주입 확인. shared-space-ui→lms-ui import 0.
- **무변경:** backend, Neture, package/lock/Dockerfile, `@o4o/lms-ui`.
- **browser smoke:** 미수행 — 배포 후 KPA(blue)/GP(green)/KCos(pink) `/lms` 강의명 링크·CTA·체크박스 accent 색, 목록/검색/페이지네이션/상세 이동, Neture LMS 메뉴 없음 확인 권장.

## 10. 후속 작업

1. **`IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`** — visibility 컬럼 + KCos visibility 노출 약함 조사(KCos 는 현재 visibility 미매핑 → category fallback).
2. **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`** — dormant `@o4o/lms-ui CourseCard/List` 처리 방향.
3. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선.

## 11. 완료 판정

**PASS.** `LmsHubTemplate` 의 hardcoded blue accent 를 `LmsHubConfig.accent?`(기본 `#2563eb`, backward-compatible) 로 정리하고 3서비스가 브랜드색(KPA blue/GP green/KCos pink)을 명시 주입. 강의명 링크·기본 CTA·선택 체크박스만 accent 화, 중립/의미 색은 유지. 기능·구조 불변, shared-space-ui→lms-ui 의존·CourseCard 혼입·takeaway 재도입 없음(Neture guard 유지), 3서비스 typecheck 0. **LMS 사용자 화면 공통화가 구조 + 주요 색상 config 까지 정리됨.**
