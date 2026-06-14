# CHECK-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1

> **작업명:** WO-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1
> **유형:** QR / 제품설명 / 제작자료 AI 의 preset 연결 상태 서비스 간 정렬 (frontend-only, 기존 surface 한정)
> **결과: PASS (정렬 이미 완료 — 코드 변경 없음)** — 조사 결과 **제품설명은 3서비스 모두 `AiContentModal` + template preset 연결 완료**, **QR 은 KPA-only(AI 보유) / GP·KCos 는 QR AI surface 부재(신규 미구축)**, **제작자료 editor 는 nav state 로 template 수신(모달 미렌더, 3서비스 동일)**, **라이브러리 진입 모달은 3서비스 모두 generic(타깃·template 미선택 시점 — KPA 포함 설계상 동일)**. → **신규 코드 변경 불요.** POP 정렬 결과·backend·모델/provider 무영향. 본 WO 는 정렬 상태 검증 + 문서화.
> **선행:** `WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1`(POP 모달 정렬) · `IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`
> **작성일:** 2026-06-14 · 기준 HEAD `867671c7f`

---

## 1. 목적

POP AI 가 3서비스 `AiContentModal` 로 정렬된 뒤, QR/제품설명/제작자료 AI 의 preset 연결을 서비스 간 정렬한다. **기존 surface 만**, **없는 화면 신규 구축 금지**(WO §1·§4).

## 2. 선행 POP modal adoption 요약

- 직전 WO 로 GP/KCos POP 인라인 fetch → `AiContentModal`(template-aware) 정렬. 3서비스 POP AI 가 공통 모달 + `/api/ai/content`(resolver/preset) 사용.
- 본 WO = 나머지 store surface(QR/제품설명/제작자료/라이브러리) 정렬 상태 점검.

## 3. surface × 서비스 매트릭스 (조사 결과)

| surface | KPA | GlycoPharm | K-Cosmetics | 판정 |
|---------|-----|-----------|-------------|------|
| **QR** | `AiContentModal` + QR template ✅ | QR 화면 존재, **AI 없음** | QR 화면 존재, **AI 없음** | KPA reference / GP·KCos 미구축(§5) |
| **제품설명** | `AiContentModal` + template(id/systemPrompt/forcedOptions) ✅ | **동일 ✅** | **동일 ✅** | **3서비스 정렬 완료(§6)** |
| **제작자료 editor**(ProductionMaterialEditorPage) | 모달 미렌더 · nav state `selectedTemplateId`→starterHtml ✅ | **동일** | **동일** | 3서비스 동일(§7) |
| **라이브러리 진입**(StoreLibraryContentsPage) | `AiContentModal` **generic**(template 미전달) | **동일 generic** | **동일 generic** | 설계상 generic — 3서비스 동일(§7) |

- 근거: `<AiContentModal` 실제 렌더 = 제품설명(3)·라이브러리(3) 각 1, 제작자료 editor = **0**(결과 수신 화면). 제품설명 3서비스 모두 `parseProductionRouterState`→`findTemplate`→`selectedTemplate` 소싱 + `templateId/templateSystemPrompt/templateForcedOptions` 전달.

## 4. 변경 파일

**없음 (코드 변경 0).** 산출 = 본 CHECK 문서 1개.

| 파일 | 변경 |
|------|------|
| `docs/checks/CHECK-...-V1.md` | **신규** — 정렬 상태 검증 결과 |

## 5. QR surface별 결과

- **KPA:** `StoreQRPage` 가 `AiContentModal`(QR template-aware, `templateId/systemPrompt/forcedOptions` 연결) 사용 — **이미 정렬(reference).**
- **GP/KCos:** `StoreQrPage` 존재하나 **AI 생성 기능 자체가 없음**(`AiContentModal` 0, AI fetch 0 — form-only). WO §3 "GP/KCos 에 QR AI 가 없으면 새로 만들지 않는다" → **미구축 유지.** (QR AI 도입은 별도 제품 결정 — 본 WO 범위 밖.)

## 6. 제품설명 surface별 결과

- **KPA / GP / KCos 전부** `AiContentModal` + `templateId={selectedTemplate?.id}` + `templateSystemPrompt` + `templateForcedOptions` 연결, `selectedTemplate` 는 router state(`parseProductionRouterState`→`findTemplate`) 소싱. **3서비스 정렬 완료 — 변경 불요.** (product-description template registry 재사용 중.)

## 7. 제작자료 / 라이브러리 surface별 결과

- **제작자료 editor(ProductionMaterialEditorPage):** 3서비스 모두 `AiContentModal` **미렌더**. 라이브러리 모달이 생성한 HTML 을 nav state(`generatedHtml`)로 받아 RichTextEditor 검토 + `selectedTemplateId`→`starterHtml` fallback. template 은 state 로 전달됨 — **3서비스 동일 구조, 모달 연결 대상 아님.**
- **라이브러리 진입(StoreLibraryContentsPage):** 3서비스 모두 `AiContentModal` 을 **generic**(template prop 미전달)으로 사용. **KPA 포함** — `handleAiAction` 이 AI 카드에서 `aiInitialText` 만 세팅하고 모달을 여는 시점에 **production 타깃/template 이 아직 선택되지 않음**(타깃 선택은 POP/QR/블로그/제품설명 CTA 가 각 페이지로 navigate). 따라서 전달할 template 이 scope 에 없음 → **설계상 generic(3서비스 동일).** 강제 default preset 주입은 새 동작 → `EditingPreset` 일반화(후속 §10-1)에서 다룸.

## 8. preset 연결 결과 / 보류 surface

- **연결 완료(변경 불요):** POP(선행 WO), 제품설명(3서비스).
- **reference/미구축:** QR — KPA 연결, GP/KCos AI 부재(신규 미구축).
- **보류(의도적 generic):** 라이브러리 진입 모달 — 타깃 미선택 시점이라 template 무전달. default preset 은 후속 `EditingPreset` WO.
- **대상 아님:** 제작자료 editor(모달 미렌더, state 로 template 수신).

## 9. backend 미수정 확인

- `/api/ai/content`·`content-to-store-use`·prompt builder·POP/QR/desc generate endpoint **변경 0**. 프론트 코드 변경 0. DB/migration 0.

## 10. 검증 결과

- **TypeScript:** 코드 변경 없음 → 회귀 없음(typecheck 불요, 변경 파일=문서 1개).
- **정적(매트릭스 §3):**
  - QR/제품설명/제작자료/라이브러리 surface별 `<AiContentModal>` 렌더 + template prop 전달 여부 표 작성(§3).
  - 제품설명 = 3서비스 template 연결 확인. QR = KPA-only(GP/KCos 미구축). 라이브러리 = 3서비스 generic(설계상).
  - **없는 surface 신규 구축 0**(GP/KCos QR AI 미생성).
  - POP 정렬 결과 무영향(StorePopPage 미수정). 모델/provider 작업 미혼입.
- **무변경:** 모든 서비스 소스, backend, DB/migration, package.json/pnpm-lock, Dockerfile.
- **browser smoke:** 미수행 — 배포 무관(코드 변경 없음). 기존 QR(KPA)·제품설명(3) 모달은 기존 동작 유지.

## 11. 정렬이 이미 완료인 이유 (왜 코드 변경이 없는가)

POP 정렬 WO 이전에 이미 **제품설명은 POP 와 동일한 template-aware 패턴**으로 3서비스에 적용돼 있었고(`selectedTemplate` 소싱 + 3 prop 전달), QR 은 **KPA 만 AI 보유**(GP/KCos 는 surface 자체가 form-only), 제작자료/라이브러리는 **모달 미렌더 또는 타깃-미선택 generic** 구조였다. 즉 본 WO 의 정렬 대상 중 **실제 미정렬 격차였던 것은 POP(선행 WO 에서 해소)** 뿐이고, 나머지는 이미 정렬 또는 의도적 generic. **억지 변경(QR AI 신규·라이브러리 강제 preset)은 WO §4 금지 항목** → 미수행.

## 12. 후속 작업

1. **`WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1`** — surface-agnostic `EditingPreset` 일반화(LMS 레슨·resources + 라이브러리 default preset 포함 검토).
2. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — LMS 강의구조(2단계) 별도 설계.
3. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — 비-Gemini provider 확장 관문.
4. **`IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1`** — 중국계 provider 도입 전 거버넌스.
5. **(선택) QR AI 도입 제품 결정** — GP/KCos QR AI 가 필요하면 별도 WO(POP 패턴 재사용).

## 13. 완료 판정

**PASS.** QR/제품설명/제작자료/라이브러리 AI surface 의 preset 연결 상태를 3서비스에 걸쳐 검증 — **제품설명 3서비스 정렬 완료, QR KPA-only(GP/KCos 미구축 유지), 제작자료 state 수신(동일), 라이브러리 generic(설계상 동일)**. POP 외 미정렬 격차 없음 → **코드 변경 없이 정렬 확인**, 없는 화면 신규 구축·억지 preset 주입 미수행(WO §4 준수). backend/모델/package/Dockerfile 무변경. 다음은 `EditingPreset` 일반화로 store 바깥(LMS/resources) + 라이브러리 default preset 까지 확장.
