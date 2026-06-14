# IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** DeepSeek / Qwen 등 중국계(또는 중국계 기반) AI provider 를 O4O 편집 AI 에 도입해도 되는지 **데이터 거버넌스** 관점에서 판정한다. 비용은 본 IR 범위 밖(`IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1`).
> **작성일:** 2026-06-14 · 기준 HEAD `488da1123`
> **선행:** `CHECK-O4O-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1`(§7-8: 중국계 provider 는 비용만 보고 도입 금지)
> **데이터 주의:** provider 정책은 2026-06 공식·집계 자료 기준(작성자 cutoff 2026-01 이후) → **도입 직전 공식 DPA/privacy policy 재확인 필수.**

---

## 1. 목적

비-Gemini provider 를 실제 적용(provider abstraction WO)하기 전, **데이터 처리·리전·학습사용·보관** 관점에서 사용 가능/제한/금지를 판정한다. read-only.

## 2. 결론 요약 (먼저)

1. **DeepSeek(first-party `api.deepseek.com`)와 Qwen(Alibaba Model Studio International)은 거버넌스 등급이 다르다.**
   - **DeepSeek 1st-party:** 데이터 **중국 저장** + **입력의 학습 사용 가능** + 개방형 보관 + 표준 API no-train opt-out 불명확 → **기본값 금지(C), 고위험 금지(D).** 업무 사용은 local/enterprise ZDR 필요.
   - **Qwen(Alibaba Model Studio, International/Singapore):** Alibaba 공식 **"데이터를 모델 학습에 사용하지 않음"** + **Singapore 데이터 레지던시**(엔드포인트·저장 Singapore, 추론은 중국 본토 제외) + 암호화 → **제한적 가능(B)**(admin 명시 선택 + 저위험 surface).
2. **편집 AI 입력의 현실적 노출 = A(저위험)~B(중위험).** 환자/처방/개인식별(C 고위험)은 *편집 AI 입력에 들어가면 안 되는* 데이터 — 어떤 외부 provider 든 전송 금지(Gemini 포함 정책).
3. **Gemini 는 민감 도메인 기본값 유지.** 비-Gemini 는 **admin opt-in + provider×surface allowedSurface + 고위험 차단**의 guardrail 하에서만.
4. **DeepSeek 을 쓰려면** 1st-party API 대신 **open-weight 를 서방 no-train/ZDR 추론 호스트로 서빙**하는 경로가 거버넌스상 안전(모델 ≠ DeepSeek 데이터 정책 분리). 단 이는 별도 통합.
5. → provider abstraction WO 진행 가능하되 **guardrail config 필수 동반**.

## 3. 선행 AI closure 요약

- 편집 AI 공통화 1차 CLOSED. Gemini 2.5 flash/pro/flash-lite 선택지 정리. 비-Gemini 적용은 `generateRawContent` gemini 고정 해제(provider abstraction) 필요 — 그 **전제 조건이 본 거버넌스**.

## 4. 후보 provider

| provider | 엔드포인트 | OpenAI-compat | 비고 |
|----------|-----------|:---:|------|
| DeepSeek (1st-party) | `api.deepseek.com`(중국) | ✅ | open-weight(서방 호스트 서빙 가능) |
| Qwen (Alibaba Model Studio) | `dashscope-intl`(Singapore) | ✅ | International edition |
| (현행) Gemini | Google | — | 민감 도메인 기본값 |

## 5. 공식 데이터 처리 정책 요약

| 항목 | DeepSeek 1st-party | Qwen (Alibaba Model Studio Intl) |
|------|--------------------|----------------------------------|
| 데이터 저장 리전 | **중국** | **Singapore**(International — 저장·엔드포인트, 추론 중국본토 제외) |
| 입력 학습 사용 | **가능**(inputs analyzed to improve tech) | **미사용**(Alibaba: never use your data for model training) |
| 보관 기간 | 입력 ~30일이나 "필요한 만큼" 개방형 | 선택 리전 내 저장(데이터 레지던시) |
| no-train / ZDR | 표준 API **불명확** — 업무용은 local/enterprise ZDR 필요 | 학습 미사용 명시 + 암호화 |
| 규제 이슈 | EU/US 데이터 중국 이전 → 규제 조사 사례 | International edition 으로 레지던시 충족 설계 |
| 거버넌스 등급 | **높은 위험** | **중간/관리가능** |

- 출처(§12). **도입 직전 DPA/privacy policy 원문 재확인 필수**(정책 변동성).

## 6. O4O 편집 AI 데이터 분류

| 등급 | 예 | 외부 provider 전송 |
|:---:|----|---------------------|
| **A 저위험** | POP 문구, 블로그 초안, QR 안내문, 일반 교육 초안, 비식별 설명문 | 조건부 가능(no-train provider) |
| **B 중위험** | 공급사 제품설명 원문, 약국/매장 운영 콘텐츠, 강의자료 초안, 제작자료 초안, 사업자 문서 초안 | no-train + 레지던시 명확 시 admin opt-in |
| **C 고위험** | 환자정보, 처방/조제, 개인식별, 약국 매출/거래, 비공개 계약/가격/정산, 민감 협회 내부문서 | **전송 금지/별도 승인**(provider 무관) |

- **편집 AI 입력의 현실 범위 = A~B.** C 는 편집 AI(마케팅/교육 콘텐츠 작성)에 애초 투입 대상이 아님 — 그러나 B(공급사 원문·강의자료)에 준-독점 정보가 섞일 수 있어 **no-train 필수**.

## 7. surface별 위험도 (provider 적용 관점)

| surface | 데이터 등급 | 비-Gemini 실험 |
|---------|:---:|:---:|
| POP 짧은 문구 | A | 가능(no-train) |
| QR 안내문 | A | 가능(no-train) |
| 블로그 초안 | A | 가능(no-train) |
| 제품설명 초안 | A~B | B면 admin opt-in |
| 라이브러리 초안 | A~B | B면 admin opt-in |
| LMS 레슨 본문/구조 | B | admin opt-in(강의자료 준-독점) |
| resources 글쓰기 | B | admin opt-in |

## 8. provider별 리스크 → 판정 (A~D)

- **DeepSeek 1st-party API:** 학습사용+중국저장+no-train 불명확 → **C(기본값 금지)** + 고위험 도메인 **D(금지)**. *open-weight 를 서방 no-train/ZDR 호스트로 서빙 시* A~B surface 실험 가능(별도 통합·재평가).
- **Qwen(Alibaba Model Studio Intl/Singapore):** no-train + Singapore 레지던시 + 암호화 → **B(제한적 가능)**: admin 명시 선택 시 A(+검토된 B) surface 실험. 기본값 아님. 고위험 도메인은 Gemini.
- **Gemini(현행):** 민감 도메인 **기본값 유지**.

## 9. provider abstraction WO 선행 조건 (guardrail)

provider abstraction WO 진행 가능하되 **다음 안전장치 필수**:
1. **provider별 `allowedSurface`** — provider 가 처리 가능한 surface 화이트리스트(예: DeepSeek 1st-party=none-by-default, Qwen=A surface).
2. **기본값 = Gemini** — 비-Gemini 는 admin 이 surface별로 명시 활성화한 경우만.
3. **고위험(C) 차단** — 편집 AI 입력 경로에 C 데이터 진입 자체 차단(현 구조상 C 는 편집 AI 대상 아님 — 유지·명문화).
4. **admin 경고/고지** — 비-Gemini(특히 중국계) 선택 시 데이터 처리 정책 경고 노출.
5. **로깅** — `AIUsageLog` 에 provider 기록(이미 존재) → 사후 감사 가능.

## 10. 판단 기준 적용 결과

- **A(실험 가능):** Qwen(Singapore, no-train) × A surface(POP/QR/블로그 초안) — provider abstraction + guardrail 후 A/B 실측.
- **B(제한적 가능):** Qwen × B surface(제품설명/LMS/resources) — admin opt-in, 기본값 아님.
- **C(기본값 금지):** DeepSeek 1st-party API — 데이터 정책 불명확.
- **D(금지):** 고위험 도메인(환자/처방/계약) × 모든 외부 provider. DeepSeek 1st-party × 모든 민감 데이터.

## 11. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | "OpenAI-compatible 이라 쉽다" → 데이터 거버넌스 간과 | 본 IR — 통합 난이도 ≠ 거버넌스 |
| R2 | DeepSeek 1st-party 를 비용만 보고 도입 | C/D — 기본 금지, open-weight 서방 호스트는 별도 |
| R3 | Qwen no-train 정책을 영구 보장으로 가정 | 도입 직전 DPA 재확인(정책 변동) |
| R4 | 약사회/의료 도메인 민감도 과소평가 | 고위험 차단 + Gemini 기본값 |
| R5 | guardrail 없이 provider abstraction 진행 | §9 guardrail 필수 동반(WO 묶음) |
| R6 | B 데이터(공급사 원문/강의자료) 를 A 로 오분류 | surface 등급 보수적 적용 |

## 12. 권장 후속 (조합)

1. **`KEEP-O4O-AI-GEMINI-AS-DEFAULT-FOR-SENSITIVE-DOMAINS-V1`(1순위 원칙)** — 기본값 = Gemini, 비-Gemini 는 실험/옵션만. 민감 도메인 영구 Gemini.
2. **`WO-O4O-AI-PROVIDER-GUARDRAIL-CONFIG-V1`** — provider×surface `allowedSurface` + 고위험 차단 + admin 경고 + 로깅. **provider abstraction 의 선결/동반.**
3. **`WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1`(guardrail 포함 시 진행 가능)** — `generateRawContent` gemini 고정 해제. 단 §9 guardrail 미포함 시 **착수 금지**. 1차 대상 = Qwen(Singapore) × A surface.
4. **`IR-O4O-AI-PROVIDER-SURFACE-RISK-MATRIX-V1`(선택)** — surface×provider 전송 가능/금지 매트릭스 세분화(B 데이터 경계 더 정밀화 필요 시).

→ **종합 권장:** provider abstraction 으로 갈 수 있으나 **(1)Gemini 기본값 유지 + (2)guardrail config 동반 + 1차는 Qwen(Singapore)/A surface 한정**. DeepSeek 1st-party 는 기본 보류, open-weight 서방 호스트 경로는 별도 재평가.

## 13. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB·migration 변경 없음(read-only)
- [x] 후보 provider(§4)/공식 정책(§5)/데이터 분류(§6)/surface 위험도(§7)/provider 판정(§8)/guardrail 선결(§9)/판단(§10)/위험(§11)/권장(§12)
- [x] 공식·집계 자료 기준 + 변동성 명시 + 비용 재조사·구현 미수행

## 출처

- DeepSeek 데이터 정책(중국 저장·학습 사용·보관·enterprise ZDR): [DeepSeek Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html) · [DeepSeek data retention(milvus)](https://milvus.io/ai-quick-reference/what-is-deepseeks-policy-on-data-retention) · [DeepSeek data privacy guide(skywork)](https://skywork.ai/skypage/en/deepseek-data-privacy-security-guide/2047585299882700800)
- Qwen/Alibaba Model Studio(no-train·Singapore 레지던시·리전): [Model Studio regions](https://www.alibabacloud.com/help/en/model-studio/regions/) · [Model Studio FAQ](https://www.alibabacloud.com/help/en/model-studio/faq-about-alibaba-cloud-model-studio) · [Qwen/Wan training data disclosure](https://www.alibabacloud.com/help/en/model-studio/qwen-and-wan-training-data-disclosure)

---

*End of IR-O4O-AI-DATA-GOVERNANCE-FOR-CHINESE-PROVIDERS-V1*
