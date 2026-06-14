# CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1

> **유형:** Read-only 종료 고정 CHECK (코드/package/lock/Dockerfile/backend/DB·migration 변경 없음, 문서 1개만 생성)
> **목적:** O4O **편집 AI 공통화 1차 사이클**(모델 선택 배선 + Gemini 정리 + `AiContentModal` adoption + `EditingPreset` 적용)의 완료 상태를 한 장으로 고정한다.
> **작성일:** 2026-06-14 · 기준 HEAD `c08282dc4`
> **결과: 사이클 1 종료(CLOSED).** 다음 진전은 CourseStructureAi 별도 설계 / provider abstraction(비-Gemini) / 중국계 provider 거버넌스 / Signage·admin builder 파이프라인 중 하나를 **독립 작업선**으로 연다.

---

## 1. 목적

편집 보조 AI 가 흩어져 있던 상태(모델 하드코딩 · 인라인 fetch · store-only preset)를 **공통 진입점 + 표준 preset + admin 모델 배선**으로 정렬하는 1차 사이클이 닫혔다. 추가 구현 전, 완료 범위·경계·보류를 고정해 이후 작업이 결정을 재논의하지 않게 한다.

## 2. 완료 범위 요약

| 트랙 | 산출 | 상태 |
|------|------|------|
| 모델 runtime 배선 | `resolveEditingModel()`(SSOT=`AiQueryPolicy.defaultModel`) | ✅ |
| Gemini 선택지 | flash(default)/pro/flash-lite whitelist+드롭다운 | ✅ |
| engine registry | AiEnginesPage 2.5 정렬 + 무효 `gemini-3.0-flash` 제거 | ✅ |
| 공통 모달 | `AiContentModal`(@o4o/content-editor) — POP 3서비스 정렬 | ✅ |
| preset 표준 | surface-agnostic `EditingPreset`(@o4o/types) + store `ProductionTemplate` 경계 보존 | ✅ |
| preset 적용 | resources(KPA)·LMS lesson(KPA/GP)·library-entry(KPA/GP/KCos) | ✅ |

## 3. 모델 / 엔진 트랙 완료 상태

- 편집 6개 endpoint(`/api/ai/content`·`url-to-blocks`·`vision/analyze`·`course-structure`·`lesson-body`·`content-to-store-use`) → `resolveEditingModel()` → `AiQueryPolicy.defaultModel`(admin activate 기록) → fallback `gemini-2.5-flash`. **admin 모델 선택이 편집 AI 생성에 도달.**
- Gemini 2.5 Flash default 유지 / 2.5 Pro·2.5 Flash-Lite 선택 가능(whitelist + AiQuerySettings 드롭다운). AiEnginesPage registry 2.5 정렬 + 무효 `gemini-3.0-flash` 제거(runtime seed + migration).
- 근거: `IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1`, `WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`, `WO-O4O-AI-GEMINI-MODEL-UPGRADE-V1`, `WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1`.

## 4. AiContentModal adoption 완료 상태

- 공통 편집 모달 = **`AiContentModal`(@o4o/content-editor)** — 신규 모달 추출 없음.
- POP: KPA/GP/KCos **인라인 fetch → AiContentModal 정렬**(GP/KCos 인라인 제거). 제품설명: 3서비스 template-aware 확인. QR: **KPA-only AI**(GP/KCos surface 부재 — 미구축 유지). 제작자료 editor: 모달 미렌더(nav state 로 결과 수신). 라이브러리 진입: 3서비스 generic → library-entry preset 적용.
- 근거: `WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1`, `WO-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1`.

## 5. store ProductionTemplate 경계

- store 제작물 preset SSOT = **`ProductionTemplate`(target: `ProductionTarget` = pop/qr/blog/product-description)**, 불변.
- **`ProductionTarget` 에 LMS/resources/library-entry 미추가**(store-domain 오염 금지). store template flow(POP/QR/블로그/제품설명) 무변경.

## 6. EditingPreset 적용 결과

- `@o4o/types` `EditingPreset`/`EditingSurface` + `EDITING_PRESETS`(비-store canonical) + `findEditingPreset` + `productionTemplateToEditingPreset`(store→상위계층 변환). store 4-target 을 부분집합으로 포함하는 상위 계층.
- 적용: **resource**(KPA resources, professional/medium) · **lms-lesson**(KPA/GP 레슨 본문, professional/long) · **library-entry**(KPA/GP/KCos 라이브러리, 중립 — target 미고정, systemPrompt 없음). 전부 `AiContentModal` 기존 prop(`templateSystemPrompt`/`templateForcedOptions`) 재사용.
- 근거: `IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`, `WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1`, `WO-O4O-AI-EDITING-PRESET-ADOPTION-LMS-RESOURCES-V1`.

## 7. 고정 결론 (재논의 금지)

1. **새 AI 모달 추출 불필요 — `AiContentModal` 이 표준 진입점.**
2. **store 제작물 = `ProductionTemplate` SSOT.**
3. **store 바깥 편집 AI = `EditingPreset` 사용.**
4. **`ProductionTarget` 은 store-domain 타입으로 유지**(LMS/resources/library-entry 미추가).
5. **`CourseStructureAiModal` 은 2단계 구조 — 일반 preset 에 흡수하지 않음**(별도 설계).
6. **Signage AI · admin builder generator 는 별도 파이프라인.**
7. **비-Gemini provider 는 provider abstraction + 데이터 거버넌스 검토 후 진행.**
8. **중국계 provider 는 비용만 보고 바로 도입하지 않음**(한국어/속도/안정성 실측 + 거버넌스).
9. **reward/결제/LMS closure 결정은 본 사이클에서 재논의하지 않음.**

## 8. 제외 / 보류 영역

- **CourseStructureAiModal**(2단계·고정 프롬프트·AiContentModal 비경유) → 별도 설계(§10-1).
- **Signage AI**(`/api/signage/.../ai/generate` 별도 파이프라인, 현재 placeholder) · **admin builder generator**(`/api/ai/generate`, block/page/section) → 별도 조사(§10-4).
- **비-Gemini provider**(DeepSeek/Qwen) → abstraction WO(§10-2) + 거버넌스 IR(§10-3) 후.
- **GP/KCos QR AI · KCos LMS editor** → surface 부재(신규 미구축).
- **잔여 hardcode**(admin-builder/resolver/LMS service의 gemini 기본값) → provider abstraction 시 단계 정리.

## 9. 남은 리스크

| # | 리스크 | 비고 |
|---|--------|------|
| R1 | 정책 테이블 파편화(AiQueryPolicy/AiLlmPolicy/AiSettings/ai_model_settings) | 편집 경로는 AiQueryPolicy.defaultModel 단일 소비 — 통합은 provider abstraction 시 |
| R2 | 편집 6 endpoint 의 provider='gemini' 고정(`generateRawContent`) | 비-Gemini 적용의 관문 — §10-2 |
| R3 | `@o4o/types` dist gitignored → CI 빌드 의존 | 로컬 typecheck 전 `pnpm --filter @o4o/types build` 필요 |
| R4 | library-entry preset 이 중립(systemPrompt 없음) | 타깃 선택 단계 부재 — 의도적, 강화는 후속 |
| R5 | 중국계 provider 데이터 거버넌스(약사회·의료 도메인) | 도입 전 §10-3 선행 |

## 10. 권장 후속 작업 (독립 작업선)

1. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — CourseStructureAiModal(2단계: course-structure→lesson-body) 공통화 가능 범위·계약 설계.
2. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — `generateRawContent` gemini 고정 해제 + `callProvider`(OpenAI-compatible 재사용) 수렴. 비-Gemini 관문.
3. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — DeepSeek/Qwen 도입 전 리전/데이터 처리/도메인 민감도 검토.
4. **`IR-O4O-AI-SIGNAGE-AND-ADMIN-BUILDER-PIPELINE-SCOPE-V1`** — Signage AI / admin builder generator 별도 파이프라인 조사.

## 11. 검증 (이 CHECK 자체)

- [x] 문서 1개만 생성(`docs/checks/CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1.md`)
- [x] 코드/backend/DB·migration/package.json/pnpm-lock/Dockerfile 변경 없음(read-only)
- [x] 모델·엔진(§3)/모달 adoption(§4)/store 경계(§5)/EditingPreset(§6)/고정 결론(§7)/제외(§8)/리스크(§9)/후속(§10)
- [x] 참조 문서는 repository 실재 파일명 기준(11종 확인)

## 12. 완료 판정

**CLOSED.** 편집 AI 공통화 1차(모델 runtime 배선 + Gemini 선택지/엔진 정리 + `AiContentModal` 3서비스 adoption + `EditingPreset` 표준·적용)을 종료 고정. **새 모달 불필요, store `ProductionTemplate` SSOT 보존, store 바깥은 `EditingPreset`, `ProductionTarget` 경계 유지.** CourseStructureAi(2단계)·Signage·admin builder·비-Gemini provider 는 **독립 작업선**으로 분리, reward/결제/LMS closure 는 재논의 없음. 다음 진전은 §10 중 하나를 별도로 연다 — 본 사이클의 결정(§7)은 그 작업들에서 재논의하지 않는다.
