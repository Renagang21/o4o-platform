# OTC-KO-EN-GLOSSARY — 일반의약품 설명서 한글-영문 권장 표현표

상태: **Draft V0.4** (2026-07-16) · 대상: **일반의약품(OTC) 전용** · 지침: [OTC-EN-TRANSLATION-GUIDE](OTC-EN-TRANSLATION-GUIDE.md)

> ⚠️ **이 표는 고정 사전이 아니다.** 소비자 톤 번역을 돕는 **권장 표현 모음**이다 (GUIDE T-08).
> **문맥에 맞으면 다른 표현을 써도 된다.** 표현 통일보다 **의미 정확성과 자연스러움이 우선**이다.
> 예외는 §5 **안전 표현**뿐 — 여기만 반드시 지킨다.
> 테스트 번역에서 좋은 표현이 나오면 계속 추가한다. 후보는 [TEST-LOG](OTC-EN-TRANSLATION-TEST-LOG.md)에 기록.

---

## 1. 설명서 항목명

소비자 화면용 제목은 **쉬운 표현**을, 허가·정식 문맥에서는 **정식 용어**를 쓴다. 둘 중 문맥에 맞는 쪽을 고른다.

| 한국어 | 권장 (소비자 톤) | 정식 용어 | 비고 |
|---|---|---|---|
| 효능·효과 | What it helps with | Indications | 파일럿 사용 확정. 용도만 있는 경우(피임 등) `What it is for` |
| 용법·용량 | How to take it | Dosage and Administration | **경로 따라 갈림** — 경구 `How to take it` / 비경구 `How to use it`. 판단은 `usageLabel` (**DR-019**) |
| **사용상 주의사항** | Before you take this | Precautions for Use | ⚠️ **표기 정정**(구 "사용상**의** 주의사항"). 원문 실측 라벨 = `사용상 주의사항`. 비경구는 `Before you use this` |
| 성분 및 함량 | What's in it | Ingredients and Content | 문맥 선택 |
| 주성분 | Active ingredient | Active Ingredient | |
| 첨가제 | Other ingredients | Excipients | |
| **분류 = 일반의약품** | **Over-the-counter** | OTC Drug | 파일럿 확정. 배지·`summaryTable` 공통 |
| 저장방법 | How to store it | Storage | 확인 필요 |
| 사용기한 | Use by | Expiration Date | 확인 필요 |

> **e약은요 원문 대조 시** 추가 섹션 3종이 나온다: `경고` · `상호작용` · `이상반응`. 초안(`content_json`)에는 없어 파일럿에서 미사용 — 원문 대조 작업 시 등재한다.

## 2. 제형

제형은 **제품 사실**이므로 임의로 바꾸지 않는다. 표현만 자연스럽게 조정한다.

| 한국어 | 권장 영어 | 비고 |
|---|---|---|
| 정제 | tablet | |
| 캡슐제 | capsule | |
| 연질캡슐 | soft capsule / softgel | 소비자 톤은 softgel — 확인 필요 |
| 시럽제 | syrup | |
| 좌제 | suppository | §5 참조 |
| 점안제 | eye drops | 정식: Ophthalmic Solution — 확인 필요 |
| 연고제 | ointment | 확인 필요 |
| 크림제 | cream | 확인 필요 |
| 산제 | powder | 확인 필요 |
| 과립제 | granules | 확인 필요 |
| 질정 | vaginal tablet | §5 참조 (DR-003·DR-009·**DR-019**). 파일럿 확정 |

## 3. 투여경로

> **경로는 초안 데이터에서 확정된 값을 쓴다.** 번역 입력 `meta.route`(DR-019 파생: `oral`·`vaginal`·`topical`·`ophthalmic`·`rectal`·`inhalation`·`transdermal`) 를 보고 동사를 고른다.
> **제형명(`doseForm`)으로 경로를 짐작하지 않는다** — 질정과 경구정이 둘 다 `정` 이다. `route=null`(needs_review) 이면 번역하지 말고 문의한다.

| route 값 | 한국어 | 권장 영어 | 동사 |
|---|---|---|---|
| `oral` | 경구 | by mouth | **take** |
| `vaginal` | 질 내 | in the vagina | **insert** (§5 G-01) |
| `topical` | 외용 | on the skin | apply |
| `ophthalmic` | 점안 | in the eye | put / use |
| `rectal` | 직장 | rectal | insert (§5 G-01) |
| `inhalation` | 흡입 | by inhalation | inhale / use |
| `transdermal` | 첩부 | on the skin (patch) | apply |

## 4. 용법 표현 (문맥 의존 — 고정하지 않음)

> 아래는 **예시**다. 수치는 유지하되(GUIDE T-02) 문장은 제품 문맥에 맞게 쓴다.

| 한국어 | 예시 표현 | 비고 |
|---|---|---|
| 1일 3회 | three times a day | 숫자 유지 (T-02) |
| 1회 1정 | one tablet | 제형 따라 조정 |
| 식전 | before meals | 파일럿 확정 |
| 식후 | after meals / after food | 문맥 |
| 성인 | adults | |
| 소아 | children | 원문이 연령을 명시하면 연령을 살린다 |
| 8시간 경과 후 | after 8 hours | |
| ~을 초과하지 않습니다 | Do not take more than ~ | 금지문 유지 (G-03) |

### 4-1. 연령 경계 (고정 — 조정 불가)

> ⚠️ **파일럿에서 오역 위험이 가장 컸던 지점.** 경계 포함/제외가 뒤집히면 **금기 범위가 바뀐다** (T-09 위반).

| 한국어 | **반드시 이 형태** | 쓰면 안 되는 것 | 이유 |
|---|---|---|---|
| N세 **이상** | `N or older` / `aged N and over` | ~~`over N`~~ | `over 80` 은 **80세를 제외** → 금기 축소 |
| N세 **미만** | `under N` | ~~`N or under`~~ | N 미포함 |
| N세 **이하** | `N or under` / `N years old or under` | ~~`under N`~~ | `under 2` 는 **2세를 제외** → 금기 축소 |
| N~M세 | `aged N–M` | | 양끝 포함 |

실증: `80세 이상`(P2 금기) · `2세 이하`(P3 금기) · `15세 미만`(P2 금기) · `15~79세`(P2 대상).

---

## 5. 안전 표현 (고정 — 조정 불가)

문맥 조정이 허용되지 않는 유일한 영역이다. 위반 시 오투여 위험이 있다.

| 규칙 | 내용 | 근거 |
|---|---|---|
| G-01 | **좌제·질정에 "take"·"swallow" 등 경구 표현 금지.** "insert"를 쓴다. 단 **금지문**(`do not swallow it`)은 원문 대응이라 허용. **경로는 제형명으로 판단하지 않는다(DR-019)** | DR-003·DR-009·DR-019 |
| G-02 | 투여경로를 바꾸거나 모호하게 쓰지 않는다 (점안제를 "apply"로 뭉개지 않음). | DR-002 |
| G-03 | 금기·경고를 권고로 약화하지 않는다 ("do not use" → "avoid" 금지). | GUIDE T-03·T-09 |
| G-04 | 원문에 없는 효능·용도를 표현으로 만들어내지 않는다. | GUIDE T-04 |

---

## 6. 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| V0.1 | 2026-07-15 | 초안 작성 (`WO-O4O-OTC-EN-TRANSLATION-GUIDE-DOCS-V1`). 직역 고정표. |
| V0.2 | 2026-07-15 | **고정 사전 → 권장 소비자 표현표로 전환.** 문맥 조정 허용 명시, 소비자 톤 열 추가, 안전 표현(§5 G-01~G-04)만 고정 분리 (`WO-O4O-OTC-EN-TRANSLATION-GUIDE-CONSUMER-TONE-REVISION-V1`). |
| V0.3 | 2026-07-15 | 파일럿 P1~P5 반영 — **§4-1 연령 경계 규칙 신설**(오역 최대 지점) · `사용상의 주의사항`→**`사용상 주의사항`** 표기 정정 · `Over-the-counter` 등재 · 경구/질정 표현 확정(확인 필요 해제) · 항목명은 경로 따라 take/use 로 갈림 명시(DR-019). 근거 = `CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1` |
| V0.4 | 2026-07-16 | §3 투여경로를 **route 값 기준표**로 교체 — 번역 입력 `meta.route`(DR-019 파생) 를 보고 동사를 고르고, **제형명으로 짐작하지 않는다**. `route=null`(needs_review) 이면 번역 보류. 근거 = `CHECK-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1` |
