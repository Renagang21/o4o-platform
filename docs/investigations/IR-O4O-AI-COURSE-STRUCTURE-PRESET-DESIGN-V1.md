# IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** LMS `CourseStructureAiModal`(2단계 구조 생성)을 일반 편집 AI(`AiContentModal`/`EditingPreset`) 체계와 어떻게 **분리·연결**할지 설계한다. 흡수 강제 금지.
> **작성일:** 2026-06-14 · 기준 HEAD `e21e00744`
> **선행:** `CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1`(§7-5: CourseStructureAi 는 2단계라 일반 preset 흡수 안 함)

---

## 1. 목적

편집 AI 공통화 1차가 CLOSED 된 상태에서, 별도 영역으로 남긴 `CourseStructureAiModal` 의 공통화 가능 범위를 판정한다. **구현 아님 — 설계 IR.** read-only.

## 2. 결론 요약 (먼저)

1. **CourseStructureAi 는 일반 편집 AI 와 성격이 다르다.** `AiContentModal`(단일 생성→삽입)과 달리 **2단계(구조 후보 생성 → 선택 → 본문 일괄 생성 → bulk createLesson)** 의 *오케스트레이션* 모달이다. → `AiContentModal`/`EditingPreset` 에 흡수 부적합.
2. **EditingPreset 접점은 얇다.** stage2(`lesson-body`)가 `tone`/`audience` 를 받지만 모달이 **하드코딩**('professional'/'instructor')하고, stage1(`course-structure`)은 **tone/length 옵션 자체가 없음**(5-8개 고정). 일반 preset 의 tone/length 는 부분만 닿는다.
3. **구조 생성 파라미터(lessonCount/level/objectives/sequence)는 별도 개념** = `CourseStructurePreset` 영역(현재 미존재).
4. **KPA 단일 구현**(GP 명시 제외, KCos 부재) — 수렴 대상 없음.
5. → **권장: KEEP(KPA reference 유지).** quiz/assignment KEEP 결정과 동일 논리(단일 구현 + 특수 flow + 제품 요구 부재). 가벼운 정렬(lesson-body tone 을 `lms-lesson` preset 에서 읽기)은 선택적 후속, 가치 낮음.

## 3. CourseStructureAiModal 현재 구조

- 파일: `services/web-kpa-society/src/pages/instructor/courses/CourseStructureAiModal.tsx`(424줄). KPA 전용.
- **2단계 오케스트레이션:**
  - **stage1(구조):** 입력 = topic 텍스트 **또는** url(탭). `POST /api/ai/course-structure {input, type}` → `GeneratedLesson[]{title, summary}`(5~8개). 기본 전체 선택, 사용자가 체크 조정.
  - **stage2(본문):** "선택한 레슨 추가" 시 선택 후보별 **순차** `POST /api/ai/lesson-body {courseTitle, lessonTitle, lessonSummary, tone:'professional', audience:'instructor'}` → `html`. 실패 시 `buildFallbackBodyHtml`(summary 기반) — 전체 중단 없음.
  - **삽입:** `onConfirm(GeneratedLessonWithBody[])` → 호출자(CourseEditPage `handleAddCourseStructureLessons`)가 **article 타입 lesson 일괄 createLesson**(order 순차).
- 진입: CourseEditPage 레슨 섹션 `headerExtra` 의 "🧱 AI로 강의 구조 만들기" 버튼(KPA 전용, `InstructorLessonListManager` headerExtra slot).
- 자동 저장 금지(사용자 선택 후에만). 영상/퀴즈/과제 자동 생성 안 함.

## 4. endpoint별 입력/출력

| endpoint | 입력 | 출력 | tone/length/audience |
|----------|------|------|----------------------|
| `/api/ai/course-structure` | `{ input, type:'topic'\|'url' }` | `{ success, lessons: {title, summary}[] }`(5~8) | **없음(고정 프롬프트)** |
| `/api/ai/lesson-body` | `{ courseTitle, lessonTitle, lessonSummary, tone, audience }` | `{ success, html }` | tone+audience(**모달이 하드코딩** professional/instructor) |

- stage1 은 outline 생성(개수·구조), stage2 는 개별 본문 작성(레슨 단위) — 역할 분리.

## 5. 2단계 생성 flow

`주제/URL → [course-structure] → 후보 5~8 → 사용자 선택 → [lesson-body × N 순차] → html(+fallback) → onConfirm → bulk createLesson(article)`. 단일 생성-삽입인 `AiContentModal` 과 근본적으로 다른 **batch 오케스트레이션 + 선택 UX + 부분실패 허용**.

## 6. 일반 EditingPreset 과의 접점

- **닿는 부분:** stage2 `lesson-body` 의 `tone`/`audience`. `EditingPreset('lms-lesson')` 가 `forcedOptions{tone:'professional', length:'long'}` 보유 → tone 을 preset 에서 읽어 하드코딩 대체 가능(단 현재값과 동일 'professional' → 효과 미미). `length` 는 lesson-body 파라미터 아님(미적용).
- **안 닿는 부분:** stage1 outline(개수/구조/level/objectives) — `EditingPreset` 에 해당 축 없음. 선택 UX·bulk insert·부분실패 fallback — preset 개념 밖.
- → **EditingPreset 직접 적용은 부분(tone)만 가능, 핵심(2단계 오케스트레이션)은 무관.**

## 7. 별도 CourseStructurePreset 필요 여부

- outline 제어를 제품화하려면 별도 `CourseStructurePreset` 후보 축: **lessonCount**(현재 5~8 고정), **level**(입문/심화), **learningObjectives**, **lessonSequence/moduleStructure**, (stage2)tone/audience. 
- **현재는 이 옵션들이 UI/백엔드에 없음**(고정). 즉 CourseStructurePreset 은 *신규 제품 기능*이지 기존 정렬이 아님 → **지금 도입 불필요**(요구 부재). 필요 시 별도 제품 범위 IR(§10-3).

## 8. GP/KCos 확장 가능성

- **GP:** `InstructorCourseEditPage` 가 CourseStructureAiModal **명시 제외**("KPA 전용 제외"). 레슨 본문 AI 는 `AiContentModal`(lms-lesson preset) 로 충분히 사용 중.
- **KCos:** LMS editor 자체 부재.
- → 2-stage 구조 생성을 GP/KCos 에 노출하려면 **신규 구축**(제품 결정) 필요 — 현재 요구 없음. 노출 전 `IR-...-PRODUCT-SCOPE`.

## 9. 공유 가능 / 불가

- **공유 가능(얇음):** lesson-body 의 tone(→ `EditingPreset('lms-lesson')` 에서 읽기). RichText/본문 편집은 이미 추가 후 LessonModal(`AiContentModal`+lms-lesson preset)에서 수행 — 이미 공통.
- **공유 불가:** 2단계 오케스트레이션, 구조 후보 선택 UX, bulk createLesson, 부분실패 fallback, outline 파라미터 — CourseStructureAi 고유.

## 10. 분류 A~E

- **A (EditingPreset 재사용):** stage2 lesson-body tone — `lms-lesson` preset 에서 읽기 가능(가치 낮음, 현재 동일값).
- **B (별도 CourseStructurePreset):** outline 축(lessonCount/level/objectives/sequence) — **현재 미존재, 신규 제품 기능**(지금 불필요).
- **C (KPA-only reference):** 2단계 모달 전체 — 단일 구현·특수 flow·GP/KCos 요구 부재. **KEEP.**
- **D (후속 WO 가능):** lesson-body tone 가벼운 정렬, 또는 모달 UI/옵션 polish(lessonCount/tone 노출) — 저우선.
- **E (제외):** Signage AI, admin builder, 비-Gemini provider, reward/credit.

## 11. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | 2단계 모달을 `AiContentModal`/`EditingPreset` 에 흡수 시도 → 단일 생성 모델과 불일치 | C(KEEP) — 오케스트레이션은 별개 |
| R2 | 단일 구현(KPA) 위에 CourseStructurePreset 신설 → 조기 추상화 | B 보류(요구 시 §10-3) |
| R3 | lesson-body tone 정렬을 과대평가 | 현재 'professional' 동일 — 효과 미미, D 저우선 |
| R4 | GP/KCos 노출을 정렬 작업으로 오인 | 신규 구축(제품 결정) — IR-PRODUCT-SCOPE 선행 |
| R5 | quiz/assignment KEEP 과 결정 불일치 | 동일 논리 적용(단일 구현 → KEEP) |

## 12. 권장 후속 (1순위 = KEEP)

1. **`KEEP-O4O-AI-COURSE-STRUCTURE-AI-AS-KPA-REFERENCE-V1`(1순위)** — CourseStructureAiModal 을 **KPA-only reference 로 유지**. 근거: 단일 구현(수렴 대상 없음) + 2단계 오케스트레이션(일반 모달과 이질) + GP/KCos 제품 요구 부재 + EditingPreset 접점 얇음. 본 closure(§7) 결정과 일치. (별도 KEEP 문서는 본 IR §12 로 충분 — 필요 시에만 생성.)
2. **`WO-O4O-AI-COURSE-STRUCTURE-PRESET-LIGHT-ALIGNMENT-V1`(선택, 저우선)** — stage2 lesson-body 의 하드코딩 tone 을 `findEditingPreset('lms-lesson')?.forcedOptions?.tone` 에서 읽도록 가벼운 정렬(일관성). 가치 낮아 보류 가능.
3. **`IR-O4O-AI-COURSE-STRUCTURE-PRODUCT-SCOPE-V1`** — GP/KCos 확장 또는 outline 옵션(lessonCount/level/objectives) 제품 요구가 생기면 범위 조사(CourseStructurePreset 여부 포함).
4. **`WO-O4O-AI-COURSE-STRUCTURE-MODAL-POLISH-V1`(선택)** — 기존 KPA flow 유지하며 UI/문구/옵션(예: 레슨 개수 선택) polish.

## 13. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB·migration 변경 없음(read-only)
- [x] 모달 구조(§3)/endpoint(§4)/2단계 flow(§5)/EditingPreset 접점(§6)/CourseStructurePreset 필요성(§7)/GP·KCos(§8)/공유 가부(§9)/분류 A~E(§10)/위험(§11)/권장(§12)
- [x] 편집 closure 결정 재논의 없음, CourseStructureAi 강제 흡수 미수행

---

*End of IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1*
