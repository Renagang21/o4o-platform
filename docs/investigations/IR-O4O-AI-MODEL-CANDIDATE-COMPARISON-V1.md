# IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** O4O 편집 AI 에 쓸 모델 후보를 공식 문서 기준으로 비교한다. **모델 교체는 하지 않음.** 결론은 "Gemini 계열 즉시 개선안" 과 "비-Gemini 저가 후보의 provider 작업 비용" 을 **분리**해 제시한다.
> **작성일:** 2026-06-14 · 기준 HEAD `4027dd46e`
> **선행:** `WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1`(편집 6개 endpoint → `resolveEditingModel()`, SSOT=`AiQueryPolicy.defaultModel`)
> **데이터 주의:** 가격/모델 라인업은 2026-06 웹 공식·집계 자료 기준(작성자 학습 cutoff 2026-01 이후) → **변동성 큼, 채택 직전 공식 pricing 재확인 필수.** Kimi/Moonshot 은 사용자 지시로 **후보 제외**.

---

## 1. 목적

resolver 배선으로 admin 선택값이 편집 AI 생성에 도달하므로, 이제 "어떤 모델을 둘지" 가 의미를 가진다. 단 현 편집 경로는 **gemini-only**(`generateRawContent` provider 고정) → 후보를 **(A) Gemini 내 교체** 와 **(B) provider 추가 필요** 로 나눠 판단한다. read-only.

## 2. 현재 O4O AI 모델 배선 상태

- 편집 6개 endpoint(`/api/ai/content`·`url-to-blocks`·`vision/analyze`·`course-structure`·`lesson-body`·`content-to-store-use`) → `resolveEditingModel()` → `AiQueryPolicy.defaultModel`(admin activate 가 `engine.slug` 기록) → fallback `gemini-2.5-flash`.
- provider 추상화: `AIProvider='openai'|'gemini'|'claude'` + `MODEL_WHITELIST`(provider별) + `callProvider` switch(`callOpenAI/callGemini/callClaude`). **단 편집 경로는 `generateRawContent`(provider='gemini' 강제)로 진입** → 현재 Gemini 외 선택 불가.
- gemini whitelist: `gemini-2.5-flash`/`2.5-pro`/`2.0-flash`/`2.0-flash-lite`/`1.5-flash`/`1.5-pro`.
- **함의:** gemini whitelist 내 모델은 **resolver/admin 만으로 교체 가능(A)**. 비-Gemini 는 provider 추가 필요(B).

## 3. 후보 모델 (4개, Kimi 제외)

| # | 후보 | provider | 입력/출력 ($/1M) | context | 비고 |
|---|------|----------|------------------|---------|------|
| 0 | **Gemini 2.5 Flash**(현행 baseline) | gemini | **$0.30 / $2.50** | ~1M | 현재 default, whitelist 포함 |
| 1 | **Gemini 2.5 Pro**(Gemini 상위) | gemini | **$1.25 / $10.0**(>200K 단계 상승, batch 50%↓) | ~1M+ | **whitelist 이미 포함 → A** |
| 1b | (참고) Gemini 2.5 Flash-Lite | gemini | $0.10 / $0.40 | ~1M | 최저가, **whitelist 미포함**(추가 시 A) |
| 1c | (참고) Gemini 3.5 Flash / 3.1 Flash(신규) | gemini | 미확정(preview) | — | 2026 신규, **preview·whitelist 미포함** → A지만 검증 필요 |
| 2 | **DeepSeek V4 Flash**(중국계 저가) | (신규 OpenAI-compat) | **$0.14 / $0.28**(cache hit 98%↓) | **1M / 384K out** | OpenAI-compatible, `deepseek-chat` alias 2026-07-24 폐지→V4 id 사용 |
| 3 | **Qwen-Turbo / Qwen-Plus**(중국계 저가) | (신규 OpenAI-compat) | Turbo **$0.05/$0.20**, Plus **$0.40/$1.20** | 長(Qwen-Long 10M) | OpenAI-compatible(Singapore intl), structured JSON |

> 가격은 §데이터 주의 참조. Gemini Flash-Lite/3.x 는 현 whitelist 미포함이라 "Gemini 계열이지만 whitelist 추가" 가 선행.

## 4. 비교 기준별 정리

| 기준 | Gemini 2.5 Flash(현) | Gemini 2.5 Pro | DeepSeek V4 Flash | Qwen-Turbo/Plus |
|------|:--:|:--:|:--:|:--:|
| 짧은 편집 문구(POP/QR) | 검증됨(운영중) | 과함(비용↑) | 미검증 | 미검증(저가 매력) |
| 긴 글(블로그/칼럼) | 양호 | **품질↑** | 미검증 | 미검증 |
| 제품 설명 | 양호 | 양호 | 미검증 | 미검증 |
| 강의 구조(JSON) | 양호 | 양호 | JSON 지원 | structured JSON 지원 |
| 한국어 품질 | **강함**(운영 실측) | 강함 | **실측 필요** | **실측 필요** |
| 응답 속도 | 빠름 | 보통 | 보통(추정) | Turbo 빠름(추정) |
| 가격 | 중 | 높음 | **최저가급** | **최저가**(Turbo) |
| API 안정성 | 운영 검증 | 운영 검증 | 신규 검증 필요 | 신규 검증 필요 |
| context | 큼 | 큼 | **1M(384K out)** | 큼(Long 10M) |
| provider 연동 | **0**(현행) | **0**(whitelist 포함) | OpenAI-compat(base_url 교체) | OpenAI-compat(intl base_url) |
| O4O 적용 변경 범위 | 없음 | **resolver/admin 만** | provider 추가 + generateRawContent 해제 | 동상 + Singapore 엔드포인트 |
| 운영 리스크 | 낮음 | 낮음 | **중(중국 본토·데이터 거버넌스)** | **중(Alibaba Singapore·데이터 거버넌스)** |

## 5. provider 연동 난이도 (O4O 코드 기준)

- **Gemini 내 교체(0/1/1b/1c):** `MODEL_WHITELIST.gemini` 에 slug 추가(없으면) + admin `AiEnginesPage` 엔진 등록(`defaultModel=slug`). **코드 거의 무변경.** Pro 는 whitelist 이미 포함 → admin 등록만.
- **DeepSeek/Qwen(2/3):** 둘 다 **OpenAI-compatible** → O4O 의 기존 `callOpenAI` 경로를 **base_url/key 가변**으로 재사용 가능(from-scratch 아님). 필요 작업: ① `AIProvider` 타입 + `MODEL_WHITELIST` 에 provider/slug 추가, ② `callProvider` 에 OpenAI-compatible provider 분기(base_url override), ③ **`generateRawContent` 의 provider='gemini' 고정 해제**(핵심 의존), ④ API 키/엔드포인트 설정(env/`AiSettings`), ⑤ admin 엔진 등록. = **`WO-...-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1` 선행 필수.**

## 6. 적용 가능성 분류 A~D

- **A (즉시 적용 — Gemini 내):**
  - **Gemini 2.5 Pro** — whitelist 포함, admin 등록만으로 적용. 긴 글 품질↑, 비용↑.
  - Gemini 2.5 Flash-Lite — 최저가(POP/QR 같은 짧은 문구에 적합), **whitelist 추가**만 선행.
- **B (provider abstraction 후 적용):** **DeepSeek V4 Flash**, **Qwen-Turbo/Plus** — OpenAI-compatible 이라 abstraction 비용은 중간(기존 callOpenAI 재사용). `generateRawContent` gemini 고정 해제가 관문.
- **C (실험 후보):** DeepSeek/Qwen 의 **한국어 품질·속도·API 안정성 실측** 필요(편집 surface별 A/B 샘플). Gemini 3.5/3.1 Flash(신규·preview) — id 안정화 + whitelist 추가 후 검증.
- **D (보류/검토):** 중국계 provider 의 **데이터 거버넌스·운영 리스크**(KPA 약사회 등 도메인 민감도). 편집 보조라 개인정보 직접 투입은 적으나, provider 추가 전 **데이터 처리/리전 정책 검토** 필요(Qwen=Singapore intl, DeepSeek=중국 본토).

## 7. 편집 AI surface별 적합성 요약

- **POP/QR(짧은 문구):** 비용 민감 → Gemini 2.5 Flash-Lite(A) 또는 Qwen-Turbo(B) 가 비용상 매력. 품질 실측 전제.
- **블로그/칼럼·제품설명(긴 글):** 품질 민감 → Gemini 2.5 Pro(A) 또는 현행 Flash 유지. 저가 후보는 실측 후.
- **강의 구조(JSON 2단계):** structured output 필요 → 전 후보 지원, 단 JSON 안정성 실측 권장.

## 8. 권장 결론 (둘로 분리)

**(1) Gemini 계열 즉시 개선안 — 코드 무변경/소변경:**
- **현행 default = Gemini 2.5 Flash 유지**(검증됨). 
- 품질 필요 surface 는 admin 엔진을 **Gemini 2.5 Pro** 로 전환 가능(A, whitelist 포함). 비용 민감 surface 는 **Flash-Lite**(whitelist 추가 후). 
- 신규 **Gemini 3.5 Flash** 는 id 안정화 + whitelist 추가 + 한국어/JSON 실측 후 "intelligence/dollar" 개선 후보로 평가.

**(2) 비-Gemini 저가 후보 — provider 작업 비용 있음:**
- **DeepSeek V4 Flash**($0.14/$0.28, 1M ctx)와 **Qwen-Turbo**($0.05/$0.20) 가 비용상 가장 매력적.
- 적용 전제: ① provider abstraction WO(generateRawContent 해제), ② 한국어/속도/JSON 실측(C), ③ 데이터 거버넌스 검토(D). 
- 즉 **"싸니까 바로 교체" 아님** — provider 작업 + 실측 + 거버넌스 3종 비용을 합산해 판단.

**권장 1차 운영 후보:** Gemini 2.5 Flash 유지(default) + 필요 시 Pro 전환(A). 
**권장 실험 후보:** DeepSeek V4 Flash(저가·1M·OpenAI-compat) 를 **provider abstraction 후 A/B 실측** 대상으로.

## 9. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | 가격/모델 라인업 변동(2026-06 자료) | 채택 직전 공식 pricing 재확인(§데이터 주의) |
| R2 | "최저가=채택" 단순화 | provider+실측+거버넌스 비용 합산(§8-2) |
| R3 | 한국어 품질 미검증 후보 운영 투입 | 실측(C) 전 default 금지 |
| R4 | 중국계 provider 데이터 거버넌스(도메인 민감) | provider 추가 전 리전/처리 정책 검토(D) |
| R5 | Gemini whitelist 미포함 모델(Flash-Lite/3.x)을 "즉시" 로 오인 | whitelist 추가 선행(소변경) |
| R6 | DeepSeek 레거시 alias 폐지(2026-07-24) | V4 model id 사용, alias 금지 |
| R7 | provider 교체를 본 IR 에서 실행 | 금지 — abstraction WO 분리 |

## 10. 후속 작업

1. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`** — `generateRawContent` gemini 고정 해제 + `callProvider`(OpenAI-compatible provider 재사용) 수렴. **비-Gemini(2/3) 적용의 관문.**
2. **`WO-O4O-AI-GEMINI-MODEL-UPGRADE-V1`** — Gemini 계열 내 교체/whitelist 정리(Pro/Flash-Lite/3.x slug) + admin engine 등록. (코드 무/소변경, 즉시 트랙.)
3. **`WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1`** — admin `AiEnginesPage` 선택 가능 후보 엔진 seed 정리(provider/slug/label).
4. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — 모델과 별개 surface별 preset prompt/tone/length/output 표준(모델 비교와 독립).
5. **(권장 신규) AI 데이터 거버넌스 검토** — 중국계 provider 도입 전 리전/데이터 처리/도메인(약사회·의료) 정책 점검(D).

## 11. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] 현 배선 상태(§2)/후보 4개(§3)/기준별 비교(§4)/연동 난이도(§5)/분류 A~D(§6)/surface 적합성(§7)/결론 분리(§8)
- [x] 공식·집계 자료 기준 + 변동성 명시 + 운영 미적용
- [x] Kimi/Moonshot 제외, provider 교체·코드 수정 없음

## 12. 출처

- Gemini API pricing(2.5 Flash $0.30/$2.50, 2.5 Pro $1.25/$10 tiered, Flash-Lite $0.10/$0.40): [Gemini API pricing(felloai)](https://felloai.com/gemini-pricing/) · [opslyft](https://www.opslyft.com/blog/google-gemini-api-pricing-2026) · [tldl](https://www.tldl.io/resources/google-gemini-api-pricing)
- Gemini 모델 라인업(2.5 Flash/Pro, 3.x Flash preview, lifecycle): [Gemini API Models](https://ai.google.dev/gemini-api/docs/models) · [changelog](https://ai.google.dev/gemini-api/docs/changelog) · [Gemini 3.5 Flash(DeepMind)](https://deepmind.google/models/gemini/flash/)
- DeepSeek pricing/모델(V4 Flash $0.14/$0.28, 1M/384K, alias 폐지) + OpenAI-compatible(`https://api.deepseek.com`): [DeepSeek API Docs](https://api-docs.deepseek.com/) · [cloudzero](https://www.cloudzero.com/blog/deepseek-pricing/) · [pricepertoken](https://pricepertoken.com/pricing-page/provider/deepseek)
- Qwen pricing/모델(Turbo $0.05/$0.20, Plus $0.40/$1.20, Max $2.50/$7.50) + OpenAI-compatible(Singapore `dashscope-intl`): [Qwen OpenAI-compat(Alibaba Cloud)](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) · [Qwen structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) · [eesel Qwen pricing](https://www.eesel.ai/blog/qwen-pricing)

---

*End of IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1*
