# IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** O4O 편집 AI 의 prompt preset(tone/length/systemPrompt/outputConstraints) 구조를 **surface-agnostic 표준**으로 확장할 범위를 조사한다. **새 모달 추출 아님** — 기존 `AiContentModal` + `ProductionTemplate` + backend 프롬프트 빌더를 어떻게 전 surface 로 넓힐지.
> **작성일:** 2026-06-14 · 기준 HEAD `609cce343`
> **선행:** AI 모델 즉시 트랙 완료(resolver 배선 · Gemini 2.5 flash/pro/flash-lite · engine registry 정렬). 모델/provider 트랙과 **독립**.

---

## 1. 목적

모델은 이제 선택 가능해졌고, 남은 편집 AI 품질 차이는 대부분 **surface별 prompt preset / 문장 길이 / 톤 / 출력 형식**에서 난다. 본 IR 은 preset **메커니즘이 이미 있는지**, **어느 surface 가 빠졌는지**, **어떻게 표준 확장할지**를 정리한다. read-only.

## 2. 결론 요약 (먼저)

1. **preset 메커니즘은 이미 견고하다(신규 아님).** backend `/api/ai/content` 가 **outputType별 rich base prompt**(`buildSystemPrompt` 디스패처 + 타입별 builder) + **공유 tone/length/audience 빌더(`common.ts`)** 를 갖고, `ProductionTemplate.systemPromptOverride` 가 그 위에 customPrompt 로 stack 된다. → "표준이 없다" 가 아니라 **"표준이 store 에만 연결됨"** 이 문제.
2. **격차는 두 축:**
   - **(B) registry 커버리지:** preset registry(`ProductionTemplate`)는 **store 4-target(pop/blog/qr/product-description)만** — LMS 레슨/resources 는 **template 0**(generic 호출).
   - **(D) adoption 정렬:** LMS 레슨·resources 는 `AiContentModal` 을 **template 없이 generic** 사용. GP/KCos POP 은 일부 **인라인 fetch**(모달 미경유, 1단계 audit).
3. **경계 주의:** `ProductionTarget`(`packages/types/src/production.ts`)은 **store-domain 타입**("KPA 전용 카탈로그 — 이동 금지"). LMS/resources 를 `ProductionTarget` 에 끼우면 경계 위반 → **AiContentModal 의 generic prop(`templateSystemPrompt`/`templateForcedOptions`, store 미결합)** 을 쓰는 **별도 surface-agnostic preset** 이 안전.
4. **2단계/별도 파이프라인은 분리(C):** LMS `CourseStructureAiModal`(2단계, 고정 프롬프트, AiContentModal 비경유), Signage AI(별도), admin-builder.

## 3. 선행 AI 모델 트랙 완료 상태

- 편집 6개 endpoint → `resolveEditingModel()` → `AiQueryPolicy.defaultModel`. Gemini 2.5 flash(default)/pro/flash-lite 선택, engine registry 정렬·무효 id 제거 완료.
- 본 IR = **prompt preset 축**(모델과 직교). 모델 작업 미혼입.

## 4. 현재 AiContentModal 구조 (prop 계약)

`@o4o/content-editor` `AiContentModal`:
- preset 관련 prop: **`templateId`** · **`templateSystemPrompt`**(customPrompt 앞 prepend) · **`templateForcedOptions{length,tone}`**(open 시 자동 세팅) + `initialMode('pop'|'title_suggest'|'blog'|'store_qr')` + `initialText`.
- preset 축: **tone**(friendly/professional/concise) · **length**(short/medium/long) · custom prompt(≤500자).
- endpoint: text=`/api/ai/content`, url=`/api/ai/url-to-blocks`. 모델명 모름(backend 결정).
- **중요:** preset prop 3종은 **store 와 무관한 generic 계약** — LMS/resources 도 그대로 채워 넣을 수 있다(현재 미사용).

## 5. 현재 ProductionTemplate 구조 (preset SSOT, store)

`packages/types/src/production-template.ts` `ProductionTemplate`:
- `{ id, target: ProductionTarget, name, style, tags, systemPromptOverride, forcedOptions{length,tone}, outputConstraints{maxBodyLength,allowedLengths,requiredFields,layout}, starterHtml, layout }`.
- `ProductionTarget = 'pop'|'qr'|'blog'|'product-description'`(store 전용). registry(KPA `productionTemplates.ts`) = **11 template**(POP3/Blog3/QR3/Desc2). **LMS/resources target 없음.**

## 6. backend 프롬프트 빌더 현황 (rich, 공유)

| endpoint | base prompt | tone | length | audience | preset stack |
|----------|-------------|:--:|:--:|:--:|:--:|
| `/api/ai/content` | **outputType별 builder**(product_detail/blog/pop/summary/title_suggest/store_qr/store_sns/flexible) + 공유 `common.ts` | ✅ | ✅ | ✅ | `systemPromptOverride`→customPrompt |
| `/content-to-store-use` | 동 파이프라인(useCase→outputType: qr/pop/sns/blog) | ✅ | ✅ | ✅(매핑) | 동 |
| `/url-to-blocks` | length→block/token 매핑 + tone | ✅ | ✅ | — | customInstruction |
| `/lesson-body` | 인라인 builder(tone+audience 라벨) | ✅ | ✗ | ✅ | (template 미연결) |
| `/course-structure` | **고정** 프롬프트(구조 작업) | ✗ | ✗ | ✗ | — |
| `/vision/analyze` | **고정** 스키마 | ✗ | ✗ | ✗ | — |

- 공유 util `common.ts`: `COMMON_SYSTEM_RULES` + `buildToneInstruction/buildLengthInstruction/buildAudienceInstruction/buildOptionInstructions/buildCustomPromptInstruction`. → **tone/length 적용 지점은 backend(공유)**, 프론트는 옵션 전달만.
- **함의:** `/content`·`/content-to-store-use`·`/url-to-blocks` 는 **표준 빌더 보유** → preset 은 template 의 `systemPromptOverride`/`forcedOptions` 만 얹으면 됨. `/lesson-body` 는 tone/audience 만(length 없음), `/course-structure`·`/vision` 은 preset 비대상.

## 7. surface별 preset 적용 현황

| surface | AiContentModal | templateId 전달 | base prompt 경로 | 판정 |
|---------|:--:|:--:|------|:--:|
| POP(KPA) | ✅ | ✅(pop-*) | `/content` pop | template-driven |
| QR(KPA) | ✅ | ✅(qr-*) | `/content` store_qr | template-driven |
| Blog(KPA) | ✅ | ✅(blog-*) | `/content` blog | template-driven |
| 제품설명(KPA) | ✅ | ✅(desc-*) | `/content` product_detail | template-driven |
| 제작자료 editor | (starterHtml용) | ✅(starterHtml) | — | template-driven |
| 라이브러리 진입 | ✅ | ❌(generic) | `/content` | **generic** |
| **LMS 레슨 본문**(KPA/GP) | ✅ | ❌(initialMode/url) | `/content` 또는 `/lesson-body` | **generic(B)** |
| **resources 글쓰기**(KPA) | ✅ | ❌(generic) | `/content` | **generic(B)** |
| GP/KCos POP | (일부 인라인 fetch) | — | `/content-to-store-use` | **adoption 격차(D)** |
| LMS 강의구조 | ❌(CourseStructureAiModal) | — | `/course-structure`(2단계) | **별도(C)** |

→ **store 4-surface = template-driven(표준 적용).** LMS 레슨·resources·라이브러리 진입 = **generic(preset 미연결).** GP/KCos POP = 인라인 fetch(모달 미채택). 강의구조 = 별도 파이프라인.

## 8. surface별 prompt 차이 (preset 축 정리)

- **tone:** `/content` 계열 friendly/professional/concise(공통). store_qr/store_sns 는 easy/professional/promotion(별도 라벨). lesson-body 는 casual/concise/professional. → **라벨이 surface군별로 갈림** → 표준 preset 은 surface별 tone enum 매핑 필요.
- **length:** short/medium/long(공통). store_qr/sns 는 short/medium. lesson-body 는 length 미적용. → surface별 allowedLengths.
- **systemPrompt:** backend outputType builder(SSOT) + template `systemPromptOverride`(prepend). → **표준 = "base(outputType) + override(preset)" stack 유지.**
- **outputConstraints:** store 만 `ProductionOutputConstraints`(maxBodyLength/allowedLengths/requiredFields/layout). LMS 레슨 본문도 제약(700–1200자, 허용 태그) 존재하나 **backend 인라인**(template 미노출).

## 9. tone/length/outputConstraints 표준 후보

- **단일 축 정의:** `length: short|medium|long`, `tone: surface별 enum`(general 3종 + store 3종 + lesson 3종 → **표준 tone 집합 + surface별 allowed 매핑**).
- **preset 단위:** `{ surface, outputType, systemPromptOverride?, forcedOptions{tone,length}?, outputConstraints? }` — store `ProductionTemplate` 의 일반화. **`target`(store) → `surface`(pop/qr/blog/product-description/lms-lesson/resource/...)** 로 확장하되 store 타입 경계는 보존(§10).

## 10. 공통 preset registry 확장 방향

- **옵션 A (권장): surface-agnostic `EditingPreset` 신설.** `AiContentModal` 의 generic prop(`templateSystemPrompt`/`templateForcedOptions`)을 그대로 소비하는 **store-비결합 preset 타입/registry**. store `ProductionTemplate` 은 그 한 구현/하위집합으로 두고, LMS 레슨·resources preset 을 추가. **`ProductionTarget`(store 전용, 이동 금지) 미오염.**
- **옵션 B (비권장): `ProductionTarget` 확장.** LMS/resources 를 store target 에 끼움 → "KPA 전용 카탈로그" 경계 위반·store 도메인 오염. **금지.**
- backend 는 **무변경**(이미 outputType별 빌더 보유) — 프론트가 적절한 outputType + override/forcedOptions 를 전달하면 됨. lesson-body 는 `/content` 의 적절 outputType(또는 lesson-body 유지) 결정 필요(설계 사항).

## 11. 분류 A~E

- **A (즉시 표준화):** store 4-surface 는 이미 template-driven. **라이브러리 진입·resources** 는 AiContentModal 을 이미 쓰므로 **generic default preset(tone/length) 주입**만으로 정렬 가능(저비용).
- **B (registry 확장):** **LMS 레슨 본문·resources** 를 surface-agnostic `EditingPreset` 으로 편입(systemPromptOverride/forcedOptions/outputConstraints). store 외 target 확장.
- **C (별도 설계):** `CourseStructureAiModal`(2단계·고정), Signage AI(별도 파이프라인), admin-builder(편집 AI 성격 상이).
- **D (후속 WO):** GP/KCos POP 인라인 fetch → `AiContentModal` 채택, QR/제품설명/제작자료 preset 서비스 간 정렬.
- **E (제외):** 모델/provider 선택, 중국계 거버넌스, reward/결제, LMS closure 재논의.

## 12. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | "표준 없음" 오인 → 이미 store+backend 표준 존재 | §6/§7 — 메커니즘 보유, 커버리지/adoption 격차 |
| R2 | `ProductionTarget` 에 LMS/resources 끼움 → store 경계 위반 | §10 옵션 A(별도 EditingPreset), 옵션 B 금지 |
| R3 | preset 표준화에 backend 프롬프트 재작성 혼입 | backend outputType 빌더는 SSOT — 무변경, 프론트 전달만 |
| R4 | tone enum 이 surface군별로 달라 단일화 무리 | 표준 tone 집합 + surface별 allowed 매핑 |
| R5 | 강의구조/Signage 를 일반 preset 에 흡수 시도 | C 분리(2단계·asset 파이프라인) |
| R6 | GP/KCos POP 인라인을 preset 표준으로 직접 해결 | 모달 채택(D)이 선행 — preset 은 그 위에 |
| R7 | 모델/provider 작업 혼입 | 본 IR 모델 트랙과 직교 |

## 13. 권장 후속

1. **`WO-O4O-AI-PRODUCTION-TEMPLATE-SURFACE-PRESET-EXTEND-V1`** — store `ProductionTemplate` 을 surface-agnostic **`EditingPreset`** 로 일반화(옵션 A). store 는 하위집합 유지, LMS 레슨·resources surface 추가. `AiContentModal` generic prop 소비.
2. **`WO-O4O-AI-EDITING-MODAL-ADOPTION-ALIGNMENT-V1`** — GP/KCos POP 등 인라인 fetch AI 를 `AiContentModal` 로 정렬(D). preset 적용의 전제.
3. **`WO-O4O-AI-QR-PRODUCT-DESCRIPTION-PRESET-ALIGNMENT-V1`** — QR/제품설명/제작자료 preset 을 서비스(KPA/GP/KCos) 간 정렬.
4. **`IR-O4O-AI-COURSE-STRUCTURE-PRESET-DESIGN-V1`** — LMS 강의구조(2단계·고정 프롬프트)는 별도 설계(C).

## 14. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] AiContentModal 구조(§4)/ProductionTemplate(§5)/backend 빌더(§6)/surface 현황(§7)/prompt 차이(§8)/표준 후보(§9)/확장 방향(§10)
- [x] 분류 A~E(§11)/위험(§12)/후속(§13)
- [x] 모델/provider 작업과 분리, 새 모달 추출 아님

---

*End of IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1*
