# DOCUMENT-INDEX — O4O 콘텐츠 문서 체계 진입 지도

> 새로 합류했다면 **이 문서 하나만 읽으면** 전체 구조를 이해할 수 있다.
> 근거(결정 이력): [IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1](../IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1.md) · 운영: 본 폴더(`guides/`)

상태: Active · V1 (2026-07-12)

---

## 0. 30초 요약

O4O 콘텐츠(설명서·QR·POP·블로그·동영상·태블릿) 규칙은 **5개 축**으로 관리한다:

```text
common/            문서 체계·워크플로우·CHECK·공통 규칙       (모든 축이 상속)
content-authoring/ 콘텐츠 유형 공통 작성 원칙
ai/                AI 규칙(프롬프트·grounding·검수·안전)
products/          제품군(의약품·의료기기·의약외품·건기식)
services/          서비스(KPA·GP·KCos·Neture)               (제품군과 직교)
```

문서는 **4역할**로 분리된다: **Guide=설계 / CHECK=실행 결과 / Registry=운영 상태 / Memory=불변 결정.**

규칙은 **4계층 Registry**로 관리한다: **CR**(공통)·**DR**(의약품)·**AR**(AI)·**OR**(운영/Git/문서 관리). 규칙이 아닌 축적형 지식(ATC 오탐·그룹핑 패턴·소비자 문체)은 **Knowledge Catalog 3종**(Registry 아님)에 둔다.

문서 계보: **IR**(조사·논의) → **ADR**(최종 채택 결정, `docs/adr/`) → **Guide**(운영) → **Registry** → **Knowledge** → **WO** → **CHECK**.

---

## 1. 문서 지도

| 순서 | 문서 | 무엇을 담나 |
|---|---|---|
| 1 | [DOCUMENT-ARCHITECTURE](DOCUMENT-ARCHITECTURE.md) | 문서 체계 운영 매뉴얼 (최상위). "왜 이 구조인가"는 IR, "어떻게 운영하나"는 여기. |
| 2 | [WORKFLOW](WORKFLOW.md) | 작성 → 검토 → 승인 → 배포. 이중게이트·rollback 포함. |
| 3 | [CONTENT-CHECK-STANDARD](CONTENT-CHECK-STANDARD.md) | CHECK 문서 작성 규칙(필수 항목·표·완료 보고). |
| 4 | [CONTENT-RULE-REGISTRY](CONTENT-RULE-REGISTRY.md) · [OPERATIONAL-RULE-REGISTRY](OPERATIONAL-RULE-REGISTRY.md) | 공통 규칙(CR-NNN) · 운영/Git/문서 관리 규칙(OR-NNN). |
| 5 | [content-authoring/CONTENT-AUTHORING-PRINCIPLES](../content-authoring/CONTENT-AUTHORING-PRINCIPLES.md) | 소비자 중심·원문 우선·과장 금지·grounding 필수. |
| 6 | [ai/*](../ai/) | AI-PROMPT-STANDARD · AI-GROUNDING · AI-REVIEW · AI-SAFETY · AI-RULE-REGISTRY(AR-NNN). |
| 7 | [products/drug/*](../products/drug/) | DRUG-STANDARD · DRUG-WRITING · DRUG-GROUPING · DRUG-TEMPLATE · DRUG-RULE-REGISTRY(DR-NNN). |
| 8 | [products/drug/knowledge/*](../products/drug/knowledge/) | **Knowledge Catalog(Rule 아님)**: ATC-FALSE-POSITIVE-CATALOG · GROUPING-PATTERNS · CONSUMER-WRITING-PATTERNS. |
| 9 | products/{medical-device,quasi-drug,health-functional-food}/ · services/{kpa,gp,kcos,neture}/ | 제품군 확장 · 서비스 채널(Registry 없음, Rule ID 참조). |
| 9-a | [O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1](../products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md) | **O4O 매장용 상품 상세설명서 SSOT**. 구매 지원 목적, 제품 신뢰, 로그인 전용, 제작·비제작 범위, 공급자 제작원 표시, 매장 자체 콘텐츠 구분. |
| 9-b | [products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1](../products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md) · [products/O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1](../products/O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1.md) | 제품 단위 작성·사진 기반 등록의 실행 참고. 적용 범위와 정책은 9-a SSOT 우선. |
| 9-c | [products/general-food/](../products/general-food/) | **Legacy / Existing Content Only**. 일반식품 신규 O4O 설명서 제작은 중단하고 기존 설명서·샘플만 보존. |
| 9-d | [products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1](../products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md) | **건강기능식품 설명서 규칙 SSOT** (HFF-R01~R10). 구매 지원 우선·제품 단위·매력·신뢰·최소 제한·grounding·이중게이트·언어(ko+en)·샘플 지위. 과거 general-food R1~R10 참조 대체. |
| 10 | [../../adr/](../../adr/) | **ADR** — 채택된 결정 기록(IR=논의, ADR=결정). 소급 변환 없음, 새 결정부터. |

---

## 2. 무엇부터 읽나 (역할별)

- **O4O 상품 상세설명서 작업** → O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1 → 해당 제품군 Guide → WORKFLOW.
- **새 증상군/제품 batch 시작** → WORKFLOW → 해당 products/ Guide → CONTENT-CHECK-STANDARD.
- **규칙이 궁금** → RULE-REGISTRY(CR/DR/AR)에서 Rule ID로 찾기.
- **AI로 초안/요약/분류** → ai/ 전체.
- **서비스 채널 적용(약국 POP 등)** → services/{해당}/.
- **문서 체계 자체를 바꾸려면** → DOCUMENT-ARCHITECTURE (IR은 수정하지 않는다).

---

## 3. 절대 원칙 (한눈에)

- 하나의 규칙은 **한 곳**(SSOT)에만. 다른 문서는 Rule ID 또는 SSOT 링크로 참조.
- **CHECK는 규칙을 설명하지 않는다** — 결과만.
- **WO는 작업 차이만** — 공통은 이 폴더 참조.
- **IR은 역사(불변)**, 운영·갱신은 DOCUMENT-ARCHITECTURE.
- 콘텐츠 작업은 **read-only 조사**, DB 반영은 승인·이중게이트 후에만.
