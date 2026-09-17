# CHECK-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1

> **작업명:** WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1
> **유형:** KCos POP AI 진입을 인라인 fetch → 공통 `AiContentModal` 로 정렬 (frontend-only)
> 3서비스 POP AI 가 같은 공통 모달 + `/api/ai/content`(resolver/preset 적용 경로) 사용. POP 저장/PDF flow·backend 무변경. KPA·backend·package.json/pnpm-lock/Dockerfile 무변경.
> **선행:** `IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`(§13-2, adoption 격차 D) · `WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`(resolver 배선)
> **작성일:** 2026-06-14 · 기준 HEAD `918acaecf`

---

## 1. 목적

preset 표준을 넓히기 전, **AI 진입 경로를 공통 모달로 수렴**한다. KPA POP 은 `AiContentModal` 을 쓰지만 KCos POP 은 인라인 `fetch` 라 공통 preset/template/model-resolver 흐름이 닿지 않았다(IR §7 adoption 격차). 새 모달 추출 아님 — 미채택 surface 를 기존 공통 모달로 정렬.

## 2. 선행 IR 요약

- 공통 AI 편집 모달 = `AiContentModal`(이미 존재). KPA POP = template-aware 사용.
- KCos POP = 인라인 `fetch(/api/ai/content-to-store-use)` → preset/model 선택 미적용.
- → 미채택 surface 를 `AiContentModal` 로 수렴(IR §13-2).

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/pages/store/StorePopPage.tsx` | 동일 변환 |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** KPA POP(reference — git status 미변경 확인), backend(`/api/ai/content`·`content-to-store-use`·POP generate endpoint 그대로), POP 저장/PDF flow(`handleGenerate` 불변, `popAiContent` 형태 동일), `AiContentModal` 컴포넌트, `ProductionTemplate`/`EditingPreset` 타입, DB/migration, package.json/pnpm-lock, Dockerfile.

## 5. KCos 적용 결과

- 인라인 fetch 제거 → `AiContentModal` + `handleAiInsert` + `buildAiInputText`. 버튼·모달·prefill 동일.

## 6. KPA reference 확인

- KPA `StorePopPage` 는 `AiContentModal`(`initialMode="pop"`, template-aware, `onInsert=handleAiInsert` html 파싱) 를 이미 사용 — 이를 canonical 로 KCos 가 채택. **KPA 파일 미수정**(git status 미포함 확인).

## 7. 제거/대체한 인라인 fetch

- KCos 각 `handleAiGenerate` 내 `fetch(${API_BASE_URL}/api/ai/content-to-store-use)` 직접 호출 **제거**. AI 생성은 이제 `AiContentModal` 내부의 `/api/ai/content`(text mode, `initialMode='pop'`→pop outputType) 경유 → **`resolveEditingModel`(admin 모델 선택)·preset(systemPromptOverride/forcedOptions) 흐름이 적용됨.**
- `grep content-to-store-use` → KCos POP 코드 0건(헤더 doc-comment 도 갱신).

## 8. AiContentModal prop 연결 결과

| prop | KCos 값 |
|------|-----------|
| `initialMode` | `"pop"` |
| `initialText` | `buildAiInputText()`(주제/선택자료) |
| `templateId` | `selectedTemplate?.id`(router state 의 production template) |
| `templateSystemPrompt` | `selectedTemplate?.systemPromptOverride` |
| `templateForcedOptions` | `selectedTemplate?.forcedOptions{tone,length}` |
| `onInsert` | `handleAiInsert` → `popAiContent` |
| `aiRequestHeaders` | Bearer(getAccessToken) |

→ POP 도 라이브러리 진입 시 선택된 template preset(tone/length/systemPrompt)이 모달에 전달됨(KPA 동등).

## 9. backend 미수정 확인

- PDF 생성(`handleGenerate`)은 기존 endpoint·payload(`aiContent` 포함) 그대로. DB/migration 0.

## 10. 검증 결과

- **정적:**
  - KCos POP 에서 인라인 AI `fetch(content-to-store-use)` 제거, `AiContentModal` 사용(grep 확인).
  - AI 결과가 기존 `popAiContent`(title/bullets/shortText/longText)로 삽입 → PDF flow 무변경.
  - model resolver/admin 모델 선택 흐름이 공통 `/api/ai/content` endpoint 통해 적용 가능.
  - preset prop(templateId/systemPrompt/forcedOptions) 연결됨.
  - prompt preset 표준화(EditingPreset 일반화) 작업 미혼입.
  - KPA POP 미수정(reference).
- **무변경:** backend, DB/migration, package.json/pnpm-lock, Dockerfile.
- **browser smoke:** 미수행 — 배포 후 KCos POP 화면에서 'AI 문구 생성' → `AiContentModal` 열림 → 결과가 제목/포인트/본문에 반영 확인 권장(production write 미실행).

## 11. 후속 작업

1. **`WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1`** — store `ProductionTemplate` → surface-agnostic `EditingPreset` 일반화(LMS 레슨·resources 편입).
2. **`WO-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1`** — QR/제품설명/제작자료 preset 을 KPA/KCos 간 정렬(POP 와 동일 패턴).
3. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — LMS 강의구조(2단계) 별도 설계.
4. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — 비-Gemini provider 적용 관문.

## 12. 완료 판정

**PASS.** KCos POP AI 진입을 인라인 fetch → 공통 `AiContentModal` 로 정렬, **2서비스 POP AI 가 동일 모달 + resolver/preset 적용 경로** 사용. AI 진입 경로 수렴 완료 — 다음은 `EditingPreset` 일반화로 LMS/resources 까지 preset 표준 확장.
