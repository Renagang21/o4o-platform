# CHECK-O4O-AI-EDITING-PRESET-ADOPTION-LMS-RESOURCES-V1

> **작업명:** WO-O4O-AI-EDITING-PRESET-ADOPTION-LMS-RESOURCES-V1
> **유형:** `EditingPreset` 표준 추가 적용 — library-entry preset 적용 + 기존 적용 surface 점검 (frontend-only)
> **결과: PASS** — KPA/GP/KCos `StoreLibraryContentsPage` 의 generic AI 모달에 `findEditingPreset('library-entry')` preset(중립 tone/length, target-미고정) 적용. resources(KPA)·LMS lesson(KPA/GP) 기존 적용 무회귀 점검. `AiContentModal` 기존 prop 재사용(새 모달·새 prop 0). `ProductionTarget`/`ProductionTemplate` 무변경(store 경계 보존). backend/모델/DB·migration/package.json/Dockerfile 무변경. web-kpa-society·web-glycopharm·web-k-cosmetics typecheck 0.
> **선행:** `WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1`(EditingPreset 도입)
> **작성일:** 2026-06-14 · 기준 HEAD `d7eff68fb`

---

## 1. 목적

직전 WO 에서 도입한 `EditingPreset` 표준 중 **정의만 되고 적용 보류였던 `library-entry`** 를 실제 라이브러리 진입 모달에 적용하고, 기존 적용 surface(resources/LMS lesson)를 점검한다.

## 2. 선행 EditingPreset 도입 요약

- `@o4o/types` `EditingPreset`/`EditingSurface` + `EDITING_PRESETS`(lms-lesson/resource/library-entry) + `findEditingPreset`. `ProductionTarget` 경계 보존.
- 적용 완료: KPA resources(`resource`), KPA/GP LMS lesson(`lms-lesson`). **library-entry = 정의만(적용 보류).**

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` | `AiContentModal` 에 `findEditingPreset('library-entry')` preset 전달 |
| `services/web-glycopharm/src/pages/store-management/StoreLibraryContentsPage.tsx` | 동일 |
| `services/web-k-cosmetics/src/pages/store/StoreLibraryContentsPage.tsx` | 동일 |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `@o4o/types`(직전 WO 에서 도입 — 본 WO 는 소비만), `production.ts`/`production-template.ts`, `AiContentModal` 컴포넌트, resources/LMS lesson 소스(기존 적용 유지), backend, DB/migration, package.json/pnpm-lock, Dockerfile.

## 4. library-entry 적용 결과

- 3서비스 `StoreLibraryContentsPage` 의 AI 모달은 **구조 동일**(generic, `initialText`+`headerLabel`만) → **3서비스 동일 적용**.
- 추가 prop: `templateSystemPrompt={findEditingPreset('library-entry')?.systemPromptOverride}` · `templateForcedOptions={findEditingPreset('library-entry')?.forcedOptions}`.
- `library-entry` preset 내용: **systemPromptOverride 없음**(타깃 미선택 진입 단계 — 강한 store-target 문구 미주입) + `forcedOptions{tone:'professional', length:'medium'}`(중립 기본 tone/length). → POP/QR/블로그/제품설명 특정 target 으로 고정하지 않음(WO §3.1·§5 준수).
- `templateId` 미전달(타깃 template 아님 — 범용 초안 유지).

## 5. resources / LMS lesson 적용 점검 결과

| surface | 서비스 | preset | 상태 |
|---------|--------|--------|:--:|
| resource | KPA ResourceWritePage | `resource` | 직전 WO 적용 — 무회귀(소스 미변경) |
| lms-lesson | KPA CourseEditPage LessonModal | `lms-lesson` | 무회귀(소스 미변경) |
| lms-lesson | GP InstructorCourseEditPage LessonModal | `lms-lesson` | 무회귀(소스 미변경) |

→ 본 WO 는 위 3 surface 소스 미수정 → 기존 적용 그대로(typecheck 0 으로 무회귀 확인).

## 6. store ProductionTemplate 경계 보존 확인

- `ProductionTarget`(`production.ts`)·`ProductionTemplate`(`production-template.ts`) **미변경**. LMS/resources/library-entry 가 `ProductionTarget` 에 추가되지 않음.
- POP/QR/블로그/제품설명 store template flow 무변경(소스 미수정) — `ProductionTemplate` SSOT 유지.

## 7. 보류한 surface와 사유

- **CourseStructureAiModal:** 2단계 생성·고정 프롬프트·AiContentModal 비경유 → 별도 설계(후속 §9-1).
- **Signage AI / admin builder:** 별도 파이프라인·도메인 상이(WO §4 제외).
- **GP/KCos QR AI / KCos LMS editor:** surface 부재 — 신규 미구축(WO §4).
- **service별 preset override:** 현재 3서비스 동일 라이브러리 구조라 단일 `library-entry` preset 공통 적용. 서비스별 차이가 생기면 자체 registry override(후속) — 현재 불필요.

## 8. backend 미수정 확인

- `/api/ai/content`·prompt builder·endpoint 변경 0. preset 은 frontend 가 systemPromptOverride/forcedOptions 를 모달에 전달(기존 빌더 위 stack). DB/migration 0.

## 9. 검증 결과

- **TypeScript:** `web-kpa-society` **0**, `web-glycopharm` **0**, `web-k-cosmetics` **0**.
- **정적:**
  - `ProductionTarget` 에 LMS/resources/library-entry 미추가(§6).
  - `library-entry` preset 이 3서비스 AiContentModal 에 전달(grep 확인).
  - resources/LMS lesson preset 적용 무회귀(소스 미변경).
  - POP/제품설명/QR ProductionTemplate flow 무회귀(소스 미변경).
  - CourseStructureAi/Signage/provider 작업 미혼입.
- **무변경:** backend, DB/migration, package.json/pnpm-lock, Dockerfile, `@o4o/types`(소비만).
- **browser smoke:** 미수행 — 배포 후 KPA/GP/KCos 라이브러리 진입 AI 모달에서 기본 tone/length 가 preset(professional/medium) 기준으로 진입하는지 확인 권장(production write 미실행).

## 10. 완료 판정

**PASS.** `library-entry` EditingPreset 을 3서비스 라이브러리 진입 모달에 적용(중립 preset, target-미고정), resources/LMS lesson 기존 적용 무회귀 점검. `AiContentModal` 기존 prop 재사용, `ProductionTarget`/`ProductionTemplate` 무변경(store 경계 보존), backend/모델/DB/package/Dockerfile 무변경, typecheck 0. **일반 편집 AI preset 1차 적용 범위 완료** — 다음은 CourseStructureAi 별도 설계 또는 비-Gemini provider 트랙, 또는 AI 편집 공통화 1차 종료 고정.

## 11. 후속 작업

1. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — LMS CourseStructureAiModal(2단계) 별도 설계.
2. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — 비-Gemini provider 확장 관문.
3. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — 중국계 provider 거버넌스.
4. **`CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1`** — 모델 선택 + Gemini 정리 + AiContentModal adoption + EditingPreset 적용까지 1차 종료 고정.
