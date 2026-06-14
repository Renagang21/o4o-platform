# IR-O4O-AI-EDITING-SURFACE-CURRENT-STATE-AUDIT-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** O4O 전체에서 "편집 시 사용하는 AI"(강의 / 콘텐츠 / POP / QR / 블로그 / 제품 설명 / 강의 구조 / 자료 제작 등)의 **현재 위치·구조·prompt/preset 차이·모델 결정 경로**를 파악한다. 공통 AI editing shell 후보와 모델 설정 작업선 범위를 도출. **모델 후보는 본 IR 에서 확정하지 않음.**
> **작성일:** 2026-06-14 · 기준 HEAD `08311186d`
> **선행/경계:** LMS 공통화 1차 closure(`CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V1`) 이후 별도 작업선. LMS closure 결정·Neture LMS 제외 결정은 재논의하지 않음.

---

## 1. 목적

"강의 AI" 만 따로 보지 않고 **편집 보조 AI 전체**를 한 장으로 잡는다. 결과는 ① AI 사용처 전체 목록 ② surface 별 prompt/preset 차이 ③ 공통 editing shell 후보 ④ admin 모델/provider 설정 위치 ⑤ 현재 Gemini 2.5 Flash 결정 경로 ⑥ 모델 비교 후속 IR 범위. read-only.

## 2. 결론 요약 (먼저)

1. **공통 AI editing 컴포넌트는 이미 존재한다 = `AiContentModal`(@o4o/content-editor).** POP/블로그/제품설명/QR/자료제작 의 편집 AI 는 대부분 이 모달을 통과한다. → "신규 shell 추출" 이 아니라 **채택 정렬 + preset 표준 확장**이 핵심.
2. **preset 주입 메커니즘도 이미 있다 = `ProductionTemplate` SSOT(`packages/types/src/production-template.ts`).** surface 차이(tone/length/systemPrompt/output)를 template 로 흡수. 단 **store 제작물(POP/blog/qr/product-description)에 국한** — LMS/resources 등 비-store surface 는 미연결.
3. **모델은 backend 에 `gemini-2.5-flash` 하드코딩(10+ 곳).** admin 에 **엔진 선택 UI(`AiEnginesPage`)가 존재하나 생성 endpoint 가 이를 무시** → 선택이 실제 모델에 배선되지 않음. = D 작업선의 핵심 갭.
4. **AI 거버넌스 control plane 은 Neture admin(admin.neture.co.kr = web-neture)** 에 있다(엔진/정책/쿼터/빌링). **이는 Neture *LMS* 제외와 무관** — Neture 는 LMS 소비자가 아니지만 **플랫폼 AI 설정의 운영 주체**다(혼동 금지).
5. **단계 복잡/asset 연결 AI 는 별도(C):** LMS `CourseStructureAiModal`(2단계, KPA-only) · Signage AI(별도 파이프라인 `/api/signage/.../ai/generate`) · admin-dashboard 빌더 AI generators.

## 3. 조사 범위

- 포함: store 편집 AI(POP/QR/제품설명/블로그/제작자료/라이브러리), LMS 강의구조/콘텐츠/learner 피드백, resources 글작성, `@o4o/content-editor` AiContentModal, admin AI 엔진/정책/쿼터/빌링 설정, backend `/api/ai/*`·`/api/v1/ai/*`·signage AI, Gemini 2.5 Flash 결정 위치.
- 제외(E): AI 비용 최적화/모델 교체/provider 추가/prompt 변경 **구현**, reward budget, 결제/정산, LMS closure 재논의, Neture LMS 도입.

## 4. AI 사용처 목록 (surface inventory)

| # | Surface | 서비스 | 목적 | 컴포넌트 | endpoint |
|---|---------|--------|------|----------|----------|
| 1 | StorePopPage | KPA/GP/KCos | POP 문구(제목/포인트/본문) | KPA=AiContentModal / GP·KCos=인라인 fetch | `/api/ai/content-to-store-use` · `/api/v1/{svc}/pharmacy/pop/generate` |
| 2 | PharmacyBlogPage / StoreBlogManagePage | KPA/GP/KCos | 블로그/칼럼 글 | **3서비스 AiContentModal**(template-aware) | `/api/ai/content` |
| 3 | StoreProductDescriptionsPage | KPA/GP (**KCos 없음**) | 제품 설명 | AiContentModal + RichTextEditor | `/api/ai/content` |
| 4 | StoreQRPage | **KPA만 AI** (GP/KCos AI 없음) | QR 제목/설명 | KPA=AiContentModal / GP·KCos=form only | `/api/ai/content` |
| 5 | StoreProductionMaterialsPage / ProductionMaterialEditorPage | KPA/GP (**KCos 없음**) | 제작 자료 초안 | AiContentModal | `/api/ai/content` → `/api/v1/{svc}/store/assets` |
| 6 | StoreLibraryContentsPage(StartProductionModal) | KPA/GP/KCos | 제작 진입(초안 생성) | AiContentModal | 동상 |
| 7 | LMS CourseStructureAiModal | **KPA only** | 강의 구조(레슨 후보) 2단계 생성 | bespoke modal | `/api/ai/course-structure` → `/api/ai/lesson-body` |
| 8 | LMS 강사 LessonModal 콘텐츠 AI | KPA/GP | 레슨 본문 article/video | AiContentModal | `/api/ai/content` |
| 9 | LMS learner 피드백 | KPA/KCos | 퀴즈/과제 AI 피드백 | `aiApi`(learner) | `/api/ai/analyze`(type=quiz/assignment) |
| 10 | resources ResourceWritePage/Modal | KPA | 자료 글 작성("AI로 만들기") | AiContentModal(**template 미연결**, generic) | `/api/ai/content` |
| 11 | Signage AI | KPA(+admin signageV2) | 사이니지 콘텐츠 생성 | `signageAi.ts`(별도) | **`/api/signage/{svc}/ai/generate`**(별도 파이프라인) |
| 12 | admin-dashboard AI generators | admin builder | block/page/section/code/대화형 생성 | `services/ai/*`(SimpleAI/Block/Page/Section/Conversational/BlockCode) | `/api/ai/generate` 프록시 |
| 13 | admin AI 거버넌스 | web-neture admin | 엔진/정책/쿼터 설정 | AiEnginesPage/AiPolicyPage | `/api/ai/admin/engines\|policy` |
| 14 | operator AI 대시보드 | GP operator(KPA/KCos 없음) | 사용량/빌링 **조회** | AiUsageDashboard/AiBillingPage | `/api/ai/admin/analytics\|billing` |

## 5. 서비스별 AI 사용 현황

- **KPA-Society:** 가장 풍부. store 편집 AI(POP/QR/제품설명/블로그/제작자료) + LMS 강의구조(전용) + resources + signage. AiContentModal 채택률 높음(POP 포함).
- **GlycoPharm:** store 편집 AI 대부분 보유하나 **POP 는 인라인 fetch(모달 미사용)**, **QR AI 없음**. operator AI 대시보드(사용량/빌링) 보유. LMS 강의구조 없음(KPA 전용 제외 명시).
- **K-Cosmetics:** 블로그/라이브러리는 공통 모달. **POP 인라인, QR AI 없음, 제품설명·제작자료 surface 부재.** LMS editor 미구축.
- **Neture:** **LMS/store 편집 AI 소비 안 함.** 단 **admin(web-neture)이 AI 엔진/정책/쿼터/빌링 control plane** 을 보유 → 플랫폼 AI 설정 주체(LMS 제외와 별개 축).

## 6. surface 별 prompt / preset 구조

- **공통 모달 `AiContentModal`(`packages/content-editor/src/components/AiContentModal.tsx`):**
  - props: `open/onClose/editor/onInsert` + **`templateId` / `templateSystemPrompt` / `templateForcedOptions{length,tone}`** + `initialMode('pop'|'title_suggest'|'blog'|'store_qr')` + `initialText` + 저장 플래그(community/store/productionMaterial).
  - preset 축: **tone**(friendly/professional/concise) · **length**(short/medium/long) · custom prompt(500자). `templateSystemPrompt` 는 customPrompt 앞에 prepend, `templateForcedOptions` 는 open 시 tone/length 자동 세팅.
  - endpoint: text=`/api/ai/content`, url=`/api/ai/url-to-blocks`. **모델명 모름 — endpoint 만 호출**(모델은 backend 결정).
- **preset SSOT `ProductionTemplate`(`packages/types/src/production-template.ts`):** `{ id, target('pop'|'blog'|'qr'|'product-description'), systemPromptOverride, forcedOptions{length,tone}, outputConstraints{maxBodyLength,allowedLengths,requiredFields,layout}, starterHtml, layout }`. 10 seed(POP3/Blog3/QR3/Desc2). `getTemplatesForTarget`/`findTemplate`/`getDefaultTemplate`(KPA `pharmacy/productionTemplates.ts`).
  - **흐름:** StartProductionModal 이 template picker → caller 가 templateId/systemPrompt/forcedOptions 추출 → AiContentModal 주입 → 결과에 templateId metadata 저장.
  - **갭:** preset 표준은 **store 제작물 4 target 에 한정**. LMS(강의구조/레슨본문)·resources·signage 는 preset 미연결(generic 또는 별도 prompt).
- **인라인/별도 prompt:** GP/KCos POP 는 fetch body 에 `tone` 하드코딩(모달·template 미경유). Signage 는 `signageAi.ts` 의 `AiGenerateRequest{prompt,templateType,style,...}` 별도 구조.

## 7. 공통 editor AI 후보 vs 특수 AI 후보

- **공통(AiContentModal 정렬):** POP(GP/KCos 인라인 → 모달 통일), QR(GP/KCos AI 추가), 제품설명(KCos surface 추가) → **모달은 이미 공통, 미적용/누락처만 채택**. 블로그/라이브러리/제작자료(KPA·GP)는 이미 정렬.
- **특수(별도 설계):** CourseStructureAiModal(2단계·KPA-only), Signage AI(별도 파이프라인·asset 연결), admin-dashboard 빌더 generators(block/page/section — admin 도메인), product-description(입력 데이터·outputConstraints 큰 편).

## 8. admin AI model/provider 설정 현황

| UI | 위치 | 가능 | endpoint |
|----|------|------|----------|
| **AiEnginesPage** | `web-neture/src/pages/admin/ai/AiEnginesPage.tsx` | **엔진(provider+model) 활성화 선택** | `PUT /api/ai/admin/engines/{id}/activate`(DB-backed) |
| AiQuerySettings | `apps/admin-dashboard/src/pages/settings/AiQuerySettings.tsx` | defaultModel 드롭다운(**Gemini 계열만**) | `PUT /ai/policy` |
| AiPolicyPage | `web-neture/.../AiPolicyPage.tsx` | 쿼터(free/paid/global)·warning·aiEnabled 토글. **model 은 read-only 표시** | `PUT /api/ai/admin/policy` |
| AiUsageDashboard/AiBillingPage | `web-glycopharm/src/pages/operator/*` | 사용량/비용 **조회·빌링 조정**(편집 아님) | `/api/ai/admin/analytics\|billing` |

→ **모델/엔진을 고를 수 있는 곳은 AiEnginesPage(엔진 활성화) + AiQuerySettings(default model)**. 그러나 §9 처럼 **생성 endpoint 가 이 값을 읽지 않는다.**

## 9. 현재 Gemini 2.5 Flash 결정 경로

- **하드코딩(10+):** `ai-proxy.routes.ts`(vision/content/url-to-blocks/course-structure/lesson-body/content-to-store-use 각 핸들러), `LmsAIService.ts:136`(`provider==='gemini'?'gemini-2.5-flash':'gpt-4o-mini'`), `ai-config-resolver.ts:24`, `operator-ai-llm.service.ts:147`(Neture), policy 기본값(`AiQueryPolicy`/`AiLlmPolicy` default `gemini-2.5-flash`). admin-dashboard `BlockAIGenerator/PageAIImprover/SectionAIGenerator/BlockCodeGenerator` 도 `model:'gemini-2.5-flash'` 하드코딩.
- **provider 추상화 부분 존재하나 우회:** `AIProvider='openai'|'gemini'|'claude'` + `MODEL_WHITELIST` + `ai-proxy.service.callProvider` switch 가 있으나 **대부분 endpoint 가 직접 Gemini `generateContent?key=` 호출로 우회**.
- **DB 설정 존재하나 미사용:** `AiSettings.defaultModel`·`ai_model_settings`·엔진 활성화 값이 있으나 **런타임 생성 경로가 하드코딩 문자열 사용**. = "admin 에서 골라도 실제 모델 안 바뀜" 갭.
- **사용량/빌링은 기록됨:** `AIUsageLog`(provider/model/tokens/cost/status) + `AiUsageQuota`/`AiBillingSummary`, `ai-proxy.service` 에서 success/error 로깅.
- **엔드포인트는 service-neutral**(KPA/GP/KCos 공유, `authenticate` 만). Signage AI 만 `/api/signage/{serviceKey}/ai/generate` 로 분리.

## 10. 공통화 후보 분류 A~E

- **A (즉시 정렬 — 모달 이미 공통):** GP/KCos POP 인라인 fetch → `AiContentModal` 통일. 블로그/라이브러리/제작자료(KPA·GP)는 이미 A 완료.
- **B (config 주입 — preset 표준 확장):** `ProductionTemplate` preset(tone/length/systemPrompt/output)을 **LMS·resources·QR·제품설명** 등으로 확장 주입. surface 별 차이를 template registry 로 흡수.
- **C (별도 설계):** CourseStructureAiModal(2단계), Signage AI(asset flow), admin-dashboard 빌더 generators, product-description(입력/제약 큼).
- **D (모델 설정 작업선):** gemini-2.5-flash 하드코딩 해소 + AiEnginesPage 선택값을 생성 경로에 **배선** + provider 추상화 완성 + 모델 후보 비교.
- **E (제외):** reward budget, 결제/정산, LMS closure 재논의, Neture LMS 도입, prompt/모델 **구현** 변경.

## 11. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | "공통 모달 추출" 로 오인 → 이미 `AiContentModal` 존재(중복 작업) | shell 작업은 **추출 아님 = 채택 정렬 + preset 확장** |
| R2 | preset 표준을 store 4-target 에만 묶음 → LMS/resources 누락 | B 에서 surface-agnostic preset 계약 설계 |
| R3 | 모델 선택 UI(AiEnginesPage)가 실제 미배선 → "설정했는데 안 바뀜" | D 에서 endpoint 가 DB/엔진값 읽도록(배선 갭이 핵심) |
| R4 | Neture admin AI 거버넌스를 "Neture LMS" 와 혼동 | §2-4 분리 명시 — admin AI 설정 주체는 web-neture(별개 축) |
| R5 | Signage AI 를 일반 `/api/ai` 로 합치려는 시도 | 별도 파이프라인(asset/미디어 연결) — C 유지 |
| R6 | 모델 후보를 이번 IR 에서 확정 | 금지 — §12-4 비교 IR 로 분리 |
| R7 | admin-dashboard 빌더 generators 하드코딩까지 한 번에 | D 범위지만 builder 도메인 별도 — 점진 |

## 12. 권장 후속 (작업선 분리)

1. **`IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1`** — admin 엔진/모델 선택(AiEnginesPage·AiQuerySettings·AiPolicy)과 **하드코딩 생성 endpoint 간 배선 갭** + provider 추상화 완성도 조사(D 선결). 핵심 질문: "엔진을 바꾸면 실제 생성 모델이 바뀌는가?" = 현재 **아니오**.
2. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — `ProductionTemplate` preset(tone/length/systemPrompt/output)을 **surface-agnostic** 표준으로 확장(store→LMS/resources/QR/제품설명). AiContentModal prop 계약(§6) 기준.
3. **`WO-O4O-AI-EDITING-ASSISTANT-SHELL-V1`** — 공통 AI editing 진입(버튼+모달) **채택 정렬**: GP/KCos POP 인라인→AiContentModal, QR/제품설명 미적용처 채택. (신규 추출 아님 — 미적용/divergent surface 수렴.)
4. **`IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1`** — Gemini(상위/신규) + DeepSeek + Qwen/Alibaba Model Studio + Kimi/Moonshot 2~4개 **공식 가격/성능/한국어 품질/속도/API 호환/운영 리스크** 비교. (본 IR 미확정.)

## 13. Neture 제외 확인 (LMS) + AI 거버넌스 구분

- **Neture 는 LMS 편집 AI 미소비**(LMS route/메뉴/import 0) — LMS closure 결정 유지, 본 IR 재논의 없음.
- 단 **admin.neture.co.kr(web-neture)이 플랫폼 AI 엔진/정책/쿼터/빌링 control plane** 을 보유(§8). 이는 LMS 가 아니라 **AI 운영 거버넌스** — Neture LMS 제외와 양립. 모델 설정 작업선(D)은 이 영역을 다룬다.

## 14. 모델 후보 (이번 IR 미확정 — 후속 기록만)

Google Gemini 계열 / DeepSeek 계열 / Qwen(Alibaba Cloud Model Studio) 계열 / Kimi(Moonshot) 계열. 공식 pricing·성능·한국어·속도·호환성·운영 리스크 비교는 `IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1` 에서. **현재 운영 모델 = Gemini 2.5 Flash(하드코딩, §9).**

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-EDITING-SURFACE-CURRENT-STATE-AUDIT-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] AI 사용처(§4)/서비스별(§5)/preset 구조(§6)/공통·특수(§7)/admin 설정(§8)/Gemini 결정 경로(§9)
- [x] 분류 A~E(§10)/위험(§11)/후속(§12)/Neture 구분(§13)/모델 후보 미확정(§14)
- [x] LMS closure·Neture LMS 제외 결정 재논의 없음

---

*End of IR-O4O-AI-EDITING-SURFACE-CURRENT-STATE-AUDIT-V1*
