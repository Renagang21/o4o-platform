# products/health-functional-food — 건강기능식품 매장용 상세설명서

상태: Active · 2026-07-12 · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)

> 최상위 정책: [O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1](../O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md)  
> **규칙 SSOT: [HFF-DESCRIPTION-RULES-SSOT-V1](HFF-DESCRIPTION-RULES-SSOT-V1.md) (HFF-R01~R10)**  
> 실행 가이드: [O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1](../O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md)  
> 배치 시작: [AGENT-KICKOFF.md](AGENT-KICKOFF.md) · [examples/](examples/) · [PROCESSED-LEDGER.md](PROCESSED-LEDGER.md)

> **규칙 SSOT 이관 (2026-07-12).** 건강기능식품 설명서 작성 규칙의 SSOT는 **[HFF-DESCRIPTION-RULES-SSOT-V1](HFF-DESCRIPTION-RULES-SSOT-V1.md) (HFF-R01~R10)** 이다.
> 과거 SSOT였던 `general-food/README.md` (R1~R10)는 일반식품이 Legacy(신규 제작 중단)로 전환되며 규칙이 제거되었다. 건기식은 general-food 규칙을 상속하지 않고 위 자체 규칙을 따른다.

---

## 1. 제작 정책

건강기능식품은 O4O가 매장용 공통 상세설명서를 제작하는 핵심 상품군이다.

```text
제품 1건 = 설명서 1건
```

설명서의 최우선 목적은 소비자가 제품에 관심을 갖고, 제품의 장점과 신뢰 요소를 이해하여 구매를 고려하도록 돕는 것이다.

식약처 인정 기능성과 품목정보는 제품의 매력을 제한하는 자료가 아니라, 소비자가 제품의 장점을 믿고 선택하게 하는 핵심 근거로 사용한다.

---

## 2. 작성 방향

- 소비자의 질환·증상·생활 고민에서 시작할 수 있다.
- 제품의 기능성·함량·복합 구성·제형·섭취 편의성·제조정보를 구매 이유로 풀어 쓴다.
- 공식 기능성만 나열하는 스펙 문서로 만들지 않는다.
- 제품의 장점과 그 장점을 뒷받침하는 구체적인 근거를 함께 보여준다.
- 확인되지 않은 제품 사실, 치료·예방·효과 보장, 원료 일반정보의 제품 효과 전이는 사용하지 않는다.
- 주의사항은 꼭 필요한 범위에서 짧고 명확하게 제공하며 제품의 장점보다 앞세우지 않는다.

세부 규칙(HFF-R01~R10 · 표준 구조 · 언어 정책 · 샘플 지위)은 **규칙 SSOT [HFF-DESCRIPTION-RULES-SSOT-V1](HFF-DESCRIPTION-RULES-SSOT-V1.md)** 에서 정의한다. 본 README는 정책 개요이며, 규칙 해석은 규칙 SSOT를 따른다.

---

## 3. 운영 자료

- `HFF-DESCRIPTION-RULES-SSOT-V1.md`: **규칙 SSOT** (HFF-R01~R10 · 표준 구조 · 언어 · 샘플 지위)
- `AGENT-KICKOFF.md`: 실제 배치 작업의 시작 절차 (대상 풀·파이프라인·저장 API)
- `examples/`: 현재 정본 형식과 문체 참고 (`byeonenjang.semantic.html` = 정본)
- `PROCESSED-LEDGER.md`: 처리 원장

하위 문서가 최상위 정책과 충돌하면 `O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1`을 우선하고, 규칙 해석은 `HFF-DESCRIPTION-RULES-SSOT-V1`(HFF-R01~R10)을 따른다.
