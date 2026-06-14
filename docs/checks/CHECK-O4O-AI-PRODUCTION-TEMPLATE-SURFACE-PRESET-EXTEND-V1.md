# CHECK-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1

> **작업명:** WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1
> **유형:** surface-agnostic `EditingPreset` 표준 도입 + store 바깥 surface(resources / LMS lesson) preset 적용 (frontend + @o4o/types)
> **결과: PASS** — `@o4o/types` 에 `EditingPreset`/`EditingSurface` 타입 + 비-store canonical preset registry(`EDITING_PRESETS`, `findEditingPreset`) + `productionTemplateToEditingPreset` 변환 추가. **`ProductionTarget`/`ProductionTemplate` 무변경(store 경계 보존)**. KPA resources 글쓰기 · KPA/GP LMS 레슨 본문 AI 모달이 `AiContentModal` 의 기존 prop(`templateSystemPrompt`/`templateForcedOptions`)으로 preset 소비. backend/모델/provider/DB·migration/package.json/Dockerfile 무변경. @o4o/types·web-kpa-society·web-glycopharm typecheck 0.
> **선행:** `IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`(§10 옵션 A) · `WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1`
> **작성일:** 2026-06-14 · 기준 HEAD `b08e8bb48`

---

## 1. 목적

store 전용 `ProductionTemplate` 을 오염시키지 않고, 편집 AI 전반(store 바깥 포함)에 쓸 surface-agnostic `EditingPreset` 상위 계층을 도입한다. 작게 적용(resources / LMS lesson). 핵심 = **경계 설정**(기능 최소).

## 2. 선행 IR/WO 요약

- IR §10 옵션 A: `ProductionTarget` 확장(옵션 B) 금지 → `AiContentModal` 의 generic prop 을 소비하는 별도 `EditingPreset` 신설(store 비결합).
- POP/제품설명은 이미 `ProductionTemplate`(store)로 정렬. LMS 레슨·resources 는 template/preset 없이 generic 호출(미연결).

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/types/src/editing-preset.ts` | **신규** — `EditingSurface`/`EditingPreset` 타입 + `EDITING_PRESETS`(비-store canonical) + `findEditingPreset` + `productionTemplateToEditingPreset` |
| `packages/types/src/index.ts` | `export * from './editing-preset.js'` (main barrel — 신규 subpath 없음 → package.json 무변경) |
| `services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx` | `AiContentModal` 에 `findEditingPreset('resource')` preset 전달 |
| `services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx` | LessonModal `AiContentModal` 에 `findEditingPreset('lms-lesson')` preset 전달 |
| `services/web-glycopharm/src/pages/instructor/InstructorCourseEditPage.tsx` | 동일(LMS lesson preset) |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** `production.ts`(`ProductionTarget`)·`production-template.ts`(`ProductionTemplate`) — git 미변경 확인. `AiContentModal` 컴포넌트(기존 prop 재사용), backend(`/api/ai/content` prompt builder), 모델/provider, DB/migration, package.json/pnpm-lock, Dockerfile, KCos(해당 surface 부재). `@o4o/types` dist 는 gitignored(CI 재빌드 — 로컬은 `pnpm --filter @o4o/types build` 로 검증).

## 4. EditingPreset 타입/registry 구조

```ts
type EditingSurface = 'pop'|'qr'|'blog'|'product-description'   // store (ProductionTemplate SSOT)
                    | 'lms-lesson'|'resource'|'library-entry';  // store 바깥
interface EditingPreset {
  id; surface: EditingSurface; name; description?;
  systemPromptOverride?;                       // → AiContentModal templateSystemPrompt
  forcedOptions?: { tone?: ToneOption; length?: LengthOption };  // → templateForcedOptions
}
EDITING_PRESETS: Partial<Record<EditingSurface, EditingPreset>>  // 비-store 만(lms-lesson/resource/library-entry)
findEditingPreset(surface): EditingPreset | undefined
productionTemplateToEditingPreset(t: ProductionTemplate): EditingPreset
```
- `forcedOptions` 형태 = `ProductionTemplate.forcedOptions` 동일 → `templateForcedOptions` 로 그대로 전달(typecheck 0 으로 호환 확인).

## 5. ProductionTemplate 와의 관계 (경계)

- **store preset SSOT = `ProductionTemplate`(불변).** `ProductionTarget` 에 LMS/resources **미추가**(store-domain 오염 금지).
- `EditingPreset.surface` = `ProductionTarget` 4개를 **부분집합으로 포함**하는 상위 집합. store template 은 `productionTemplateToEditingPreset` 로 변환 참조만(역방향·target 확장 없음).
- 비-store surface(lms-lesson/resource/library-entry) preset 만 `EDITING_PRESETS` 에 canonical 기본값으로 정의(store 4-target 은 중복 정의 안 함 — ProductionTemplate registry 가 SSOT).

## 6. 적용한 surface

| surface | 서비스 | preset | 적용 |
|---------|--------|--------|:--:|
| resource(글쓰기) | KPA `ResourceWritePage` | `findEditingPreset('resource')`(professional/medium) | ✅ |
| lms-lesson(레슨 본문) | KPA `CourseEditPage` LessonModal | `findEditingPreset('lms-lesson')`(professional/long) | ✅ |
| lms-lesson | GP `InstructorCourseEditPage` LessonModal | 동일 | ✅ |

→ 기존 generic 호출이 `templateSystemPrompt`+`templateForcedOptions` 를 받아 preset 진입(tone/length 자동 + systemPrompt prepend).

## 7. 보류한 surface와 사유

- **library-entry:** `EDITING_PRESETS` 에 default preset 은 **정의했으나 적용 보류**. 라이브러리 진입 모달은 타깃 미선택 시점 generic(3서비스 동일) → 적용은 후속 `WO-...-EDITING-PRESET-ADOPTION-LMS-RESOURCES-V1` 에서(범위 최소화).
- **QR(GP/KCos):** AI surface 부재 — 신규 구축 금지(직전 WO).
- **제품설명/POP:** 이미 `ProductionTemplate` 연결 — 변경 불요.
- **CourseStructureAiModal / Signage / admin builder:** WO §4 제외(2단계·별도 파이프라인·도메인 상이).

## 8. store 경계 보존 확인

- `production.ts`(`ProductionTarget`)·`production-template.ts`(`ProductionTemplate`) **미변경**(git status 확인). LMS/resources 가 `ProductionTarget` 에 들어가지 않음.
- 기존 POP/QR/블로그/제품설명 store template 흐름 무변경(소스 미수정).

## 9. backend 미수정 확인

- `/api/ai/content`·prompt builder·endpoint **변경 0**. preset 은 frontend 가 systemPromptOverride/forcedOptions 를 모달에 전달 → 기존 backend 빌더 위에 stack. DB/migration 0.

## 10. 검증 결과

- **TypeScript:** `@o4o/types` **0**, `web-kpa-society` **0**, `web-glycopharm` **0**(`@o4o/types` dist 재빌드 후). KCos 미변경(해당 surface 부재).
- **정적:**
  - `ProductionTarget` 에 LMS/resources 미추가(§8). 기존 `ProductionTemplate` 동작 유지.
  - `EditingPreset` 이 store 바깥 surface 표현 가능(lms-lesson/resource/library-entry).
  - `AiContentModal` 기존 prop(`templateSystemPrompt`/`templateForcedOptions`) 재사용 — 새 prop·새 모달 0.
  - CourseStructureAi/Signage/admin builder 미혼입. POP/제품설명/QR 정렬 무회귀(소스 미수정).
- **무변경:** backend, DB/migration, package.json/pnpm-lock, Dockerfile.
- **browser smoke:** 미수행 — 배포 후 KPA resources/LMS 레슨 AI 모달에서 preset(tone=professional 등) 진입 확인 + 기존 POP/제품설명 모달 동작 유지 확인 권장(production write 미실행).

## 11. 후속 작업

1. **`WO-O4O-AI-EDITING-PRESET-ADOPTION-LMS-RESOURCES-V1`** — library-entry default preset 적용 + LMS/resources 적용 범위 확대(서비스별 override registry 포함).
2. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — CourseStructureAiModal(2단계) 별도 설계.
3. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — 비-Gemini provider 확장 관문.
4. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — 중국계 provider 거버넌스.

## 12. 완료 판정

**PASS.** surface-agnostic `EditingPreset` 표준을 `@o4o/types` 에 도입(타입 + 비-store canonical registry + ProductionTemplate 변환), **`ProductionTarget`/`ProductionTemplate` 무변경으로 store 경계 보존**. KPA resources·KPA/GP LMS 레슨 본문이 `AiContentModal` 기존 prop 으로 preset 소비. backend/모델/DB/package/Dockerfile 무변경, typecheck 0. 새 기능 최소·경계 정확 — 핵심은 store preset 을 보존한 채 store 바깥 편집 AI 표준의 상위 계층을 세운 것. 다음은 library-entry + LMS/resources 적용 확대.
