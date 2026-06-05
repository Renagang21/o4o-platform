# IR-O4O-LMS-LESSON-TYPE-ICON-MAPPING-AUDIT-V1

> **조사 전용 (read-only).** 코드/CSS/아이콘/마이그레이션/API 수정 없음. LMS lesson type 아이콘이 어디서 정의·렌더되는지, emoji/string/lucide/component 혼재 여부, 공통 mapping 으로 정리 가능한지 조사하고 후속 WO 를 제안한다.

- **작성일**: 2026-06-05
- **작업 유형**: Investigation (IR) — 아이콘 표준화 후속 트랙 (operator/admin sidebar 다음 단계)
- **선행 완료**: DomainIASidebar 도메인 헤딩 emoji → lucide (`CHECK-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-LIVE-SMOKE-V1` PASS)
- **원칙 근거**: `O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` (사용자-facing primary icon = lucide line icon, emoji 비사용)

---

## 1. 전체 판정

**공통화 가능 — 단, 현재 lesson type 아이콘은 emoji 이며 3~4개 render 파일에 중복 정의되어 있다.** lesson type enum 은 1곳에 canonical 로 존재하나, 아이콘 map 은 서비스별 `LmsLessonPage` 등에 emoji string 으로 **복제**되어 있다. lucide 전환 + 공통 1맵 수렴이 바람직하며, 변경면은 enum 1 + 아이콘 map 4 + render 6곳 수준이다.

| 발견 | 판정 |
|------|------|
| lesson type enum canonical | ✅ `interactive-content-core` 1곳 (video/article/quiz/assignment) |
| 아이콘 현재 형태 | 🟠 **emoji string** (📄🎬❓📝, KPA CourseIntro 는 🔴 live 추가) |
| 아이콘 map 위치 | 🟠 **3~4 파일 중복** (KPA LmsLessonPage·CourseIntroPage / Glyco·KCos LmsLessonPage) |
| 공통 아이콘 map | ❌ 없음 (서비스별 로컬 복제) |
| lucide 선례 | 🟢 admin-dashboard ContentType 은 이미 lucide(`Video/FileText/...`) 사용 — **lesson type 만 미적용** |
| Neture LMS | ✅ 미사용 (lesson type 아이콘 렌더 없음) |

---

## 2. Lesson type enum (Single Source of Truth)

`packages/interactive-content-core/src/entities/Lesson.ts:17-22`
```ts
export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}
```
- DB: `lms_lessons.type` VARCHAR(lowercase, migration `20260502160000-NormalizeLessonTypeLowercase.ts`).
- DTO: `apps/api-server/src/modules/lms/dto/lesson.dto.ts` 가 `LessonType` 소비.
- **canonical 4종**: `video / article / quiz / assignment`. (아래 `live` 는 enum 밖의 frontend-only 추가값.)

---

## 3. 아이콘 정의 인벤토리 (현재 = emoji)

3개 서비스 `LmsLessonPage` 의 `LESSON_TYPE_ICON` 은 **완전히 동일**:

```ts
const LESSON_TYPE_ICON: Record<string, string> = {
  article: '📄', video: '🎬', quiz: '❓', assignment: '📝',
};
```

| 파일 | 상수 | 라인 | 비고 |
|------|------|------|------|
| `services/web-kpa-society/src/pages/lms/LmsLessonPage.tsx` | `LESSON_TYPE_ICON` | 25-30 | + `LESSON_TYPE_LABEL`(19-24) |
| `services/web-k-cosmetics/src/pages/lms/LmsLessonPage.tsx` | `LESSON_TYPE_ICON` | 37-42 | 동일 emoji |
| `services/web-glycopharm/src/pages/education/LmsLessonPage.tsx` | `LESSON_TYPE_ICON` | 33-38 | 동일 emoji |
| `services/web-kpa-society/src/pages/courses/CourseIntroPage.tsx` | `LESSON_TYPE_ICONS` | 23-29 | **`live: '🔴'` 추가**(5종), fallback `'📄'` |

- **아이콘 형태**: 전부 **emoji string** (React component/lucide-name 아님).
- instructor 편집 페이지(`CourseEditPage`/`InstructorCourseEditPage`)는 **label 만** 정의(아이콘 없음) → 본 정비 범위 밖.

---

## 4. 렌더 지점 (render sites)

| 파일 | 라인 | 위치 |
|------|------|------|
| KPA `CourseIntroPage.tsx` | 251 | 커리큘럼 목록 행 `<span>{typeIcon}</span>` (fallback `'📄'`) |
| KPA `LmsLessonPage.tsx` | 499 | 플레이어 사이드바 lesson 목록 |
| KPA `LmsLessonPage.tsx` | 532 | 현재 lesson 헤더(아이콘 + 라벨) |
| KCos `LmsLessonPage.tsx` | 436, 462 | 사이드바 목록 / 헤더 |
| Glyco `LmsLessonPage.tsx` | 393, 418 | 사이드바 목록 / 헤더 (`aria-hidden` 부여됨) |

→ **render 6곳 / 4 파일.** Glyco 는 이미 `aria-hidden` 적용(접근성 장식). 공통 컴포넌트 없음(서비스별 LmsLessonPage 독립 구현).

---

## 5. 서비스별 LMS 사용 & 중앙화 현황

| 서비스 | lesson type 아이콘 렌더 | 비고 |
|--------|:---:|------|
| KPA-Society | ✅ LmsLessonPage + CourseIntroPage | live 타입 추가 사용 |
| GlycoPharm | ✅ education/LmsLessonPage | canonical 4종 |
| K-Cosmetics | ✅ lms/LmsLessonPage | canonical 4종 |
| Neture | ❌ 없음 | LMS 미구현 |

- **중앙화 안 됨**: 각 서비스가 `LmsLessonPage` 를 독립 구현하며 아이콘 map 을 로컬 복제. 공통 LessonList/공통 아이콘 map 부재.
- (참고) `packages/shared-space-ui/src/LessonCardPreview.tsx` 는 강의 카드용 `🎓` badge 만 사용(lesson **type** 아이콘 아님 — 범위 밖, 단 별도 정비 후보).

---

## 6. lucide 선례 / 부분 적용 상태

- **admin-dashboard 는 ContentType 에 이미 lucide 사용**: `apps/admin-dashboard/src/pages/content/assets/index.tsx:33-37`
  ```tsx
  const TYPE_ICONS: Record<ContentType, React.ReactNode> = {
    [ContentType.VIDEO]: <Video className="w-4 h-4" />,
    [ContentType.IMAGE]: <Image className="w-4 h-4" />,
    [ContentType.DOCUMENT]: <FileText className="w-4 h-4" />,
    [ContentType.BLOCK]: <Blocks className="w-4 h-4" />,
  };
  ```
  (analytics/index.tsx, assets/[assetId].tsx 도 동일 패턴.)
- → **ContentType 은 lucide, LessonType 은 emoji** 로 혼재. lesson type 만 표준 미적용 상태. lucide 매핑의 선례·근거가 이미 사내에 존재.

---

## 7. O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1 충돌

- lesson type 아이콘이 emoji(📄🎬❓📝🔴) → 표준(lucide line icon 우선) **위반**. 사용자-facing 학습 화면(플레이어 사이드바/헤더, 커리큘럼)에서 노출되어 가시성 영향 있음.
- ContentType(lucide) 과 LessonType(emoji) 의 사내 불일치 → 표준 정렬 시 일관성 향상.

---

## 8. 공통화 표면 (Standardization surface)

### 변경면 규모
```text
enum:        1 (interactive-content-core — 변경 불필요, 참조만)
아이콘 map:  4 파일 (3 LmsLessonPage + 1 CourseIntroPage)
render:      6곳
신규 공통 1맵: 1 (도입 시)
```

### 공통 배치 후보

| 후보 | 장점 | 주의 |
|------|------|------|
| **A. `packages/shared-space-ui` (권장)** | **src 소비**(빌드 불필요), 이미 lucide·React component 보유(LessonCardPreview), 전 web 서비스가 소비 | UI 패키지에 LMS 도메인 상수가 들어감 — 단 "공통 UI 아이콘 맵"으로 정당 |
| B. `packages/lms-core/src/utils` | LMS 도메인 응집 | **dist 빌드 패키지**(`main: dist/index.js`) → 변경 시 **rebuild 필요**, `.ts` 데이터 모듈이면 lucide-name string 만(컴포넌트 직접 보유 불가) |

- lucide **컴포넌트**를 보유하려면 `.tsx` 필요. shared-space-ui 는 `.tsx`/React 보유 → 컴포넌트 맵(`Record<LessonType, LucideIcon>` 또는 렌더 헬퍼) 배치에 적합.
- lms-core 에 둘 경우 data-only(`Record<type, {label, iconKey}>`) + 각 서비스에서 iconKey→lucide 해석(렌더 시점) 방식이 dist 제약상 안전.

### 권장 lucide 매핑(초안 — WO 에서 확정)

| lesson type | emoji | 권장 lucide | 대안 | 선례 |
|---|:---:|---|---|---|
| `video` | 🎬 | `Video` | `PlayCircle` | admin ContentType.VIDEO=`Video` |
| `article` | 📄 | `FileText` | `BookOpen` | admin ContentType.DOCUMENT=`FileText` |
| `quiz` | ❓ | `CircleHelp` | `ClipboardCheck` | — |
| `assignment` | 📝 | `ClipboardList` | `FileCheck` | — |
| `live`(KPA only) | 🔴 | `Radio` | `Circle`/`Video` | — |

- size/색은 기존 emoji 위치(사이드바 작은 아이콘)에 맞춰 `size≈16~18` + 텍스트색 상속, `aria-hidden` 유지(Glyco 선례).

---

## 9. 후속 WO 제안

```text
WO-O4O-LMS-LESSON-TYPE-ICON-MAPPING-STANDARDIZE-V1
```

**범위(권장):**
1. `packages/shared-space-ui` 에 공통 lesson type 아이콘 헬퍼/맵 1개 신설 (lucide 컴포넌트, `Record<LessonType, LucideIcon>` + fallback).
2. KPA/Glyco/KCos `LmsLessonPage` 의 로컬 `LESSON_TYPE_ICON` emoji 맵 제거 → 공통 헬퍼 사용. 라벨(`LESSON_TYPE_LABEL`)은 이번 범위 밖(원하면 함께 공통화).
3. KPA `CourseIntroPage` 의 `LESSON_TYPE_ICONS`(+`live`) 도 공통 헬퍼로 정렬(live 매핑 포함).
4. render 6곳 lucide 컴포넌트 렌더로 교체, `aria-hidden` 유지.

**검증:** `@o4o/shared-space-ui` 소비 4서비스 tsc + KPA/Glyco/KCos LMS lesson 화면 smoke(사이드바/헤더/커리큘럼 아이콘 lucide 확인).

**주의:** instructor 편집 페이지(label-only)·`LessonCardPreview`(🎓 badge)·digital-signage·DomainIASidebar 무접촉. emoji→lucide만, lesson type enum/DB/API 무변경.

**대안 분할:** 공통 맵 신설(1차) → 서비스별 교체(2차)로 나누면 더 안전(서비스별 staging 충돌 방지).

---

## 10. Consumer Impact Matrix

| 소비처 | lesson type 아이콘 | 영향 |
|--------|:---:|------|
| KPA-Society | LmsLessonPage + CourseIntroPage | 변경 대상(emoji→lucide) |
| GlycoPharm | education/LmsLessonPage | 변경 대상 |
| K-Cosmetics | lms/LmsLessonPage | 변경 대상 |
| Neture | 없음 | 무영향 |
| admin-dashboard | ContentType(별도 enum) 이미 lucide | 무관(참고 선례) |

---

## 11. Out of Scope

본 IR 은 조사·설계 전용. 코드/CSS/아이콘/마이그레이션/API 수정 없음. instructor label 맵·`LessonCardPreview`·DomainIASidebar/OperatorAreaShell·HeroBannerSection·store-ui-core WIP 무접촉.

---

## 12. Evidence

- enum: `packages/interactive-content-core/src/entities/Lesson.ts:17-22`
- 아이콘 map(중복): KPA `pages/lms/LmsLessonPage.tsx:25-30` · `pages/courses/CourseIntroPage.tsx:23-29`(+live) · KCos `pages/lms/LmsLessonPage.tsx:37-42` · Glyco `pages/education/LmsLessonPage.tsx:33-38`
- render: KPA 499·532, KCos 436·462, Glyco 393·418, KPA CourseIntro 251
- lucide 선례(ContentType): `apps/admin-dashboard/src/pages/content/assets/index.tsx:33-37`
- 공통 배치 후보: `packages/shared-space-ui`(src 소비, LessonCardPreview.tsx 등 React/lucide 보유) vs `packages/lms-core`(`main: dist/index.js`, utils/lmsPermissions.ts 패턴)
- DB lowercase: `apps/api-server/src/database/migrations/20260502160000-NormalizeLessonTypeLowercase.ts`

---

*코드/CSS 변경 없음. 본 IR 은 조사 기록으로 commit 한다. 후속: `WO-O4O-LMS-LESSON-TYPE-ICON-MAPPING-STANDARDIZE-V1`.*
