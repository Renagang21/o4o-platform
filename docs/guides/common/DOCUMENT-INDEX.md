# DOCUMENT-INDEX — O4O 콘텐츠 문서 체계 진입 지도

> 새로 합류했다면 **이 문서 하나만 읽으면** 전체 구조를 이해할 수 있다.
> 근거(결정 이력): [IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1](../IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1.md) · 운영: 본 폴더(`guides/`)

상태: Active · V1 (2026-07-08)

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

규칙은 **4계층 Registry**로 관리한다: **CR**(공통)·**DR**(의약품)·**AR**(AI)·**OR**(운영/Git/문서 관리). 규칙이 아닌 축적형 지식(ATC 오탐·그룹핑 패턴)은 **Knowledge Catalog**(Registry 아님)에 둔다.

---

## 1. 문서 지도

| 순서 | 문서 | 무엇을 담나 |
|---|---|---|
| 1 | [DOCUMENT-ARCHITECTURE](DOCUMENT-ARCHITECTURE.md) | 문서 체계 운영 매뉴얼 (최상위). "왜 이 구조인가"는 IR, "어떻게 운영하나"는 여기. |
| 2 | [WORKFLOW](WORKFLOW.md) | 작성 → 검토 → 승인 → 배포. 이중게이트·rollback 포함. |
| 3 | [CONTENT-CHECK-STANDARD](CONTENT-CHECK-STANDARD.md) | CHECK 문서 작성 규칙(필수 항목·표·완료 보고). |
| 4 | [CONTENT-RULE-REGISTRY](CONTENT-RULE-REGISTRY.md) | 공통 규칙 목록 (CR-NNN). |
| 5 | [content-authoring/CONTENT-AUTHORING-PRINCIPLES](../content-authoring/CONTENT-AUTHORING-PRINCIPLES.md) | 소비자 중심·원문 우선·과장 금지·grounding 필수. |
| 6 | [ai/*](../ai/) | AI-PROMPT-STANDARD · AI-GROUNDING · AI-REVIEW · AI-SAFETY · AI-RULE-REGISTRY(AR-NNN). |
| 7 | [products/drug/*](../products/drug/) | DRUG-STANDARD · DRUG-WRITING · DRUG-GROUPING · DRUG-TEMPLATE · DRUG-RULE-REGISTRY(DR-NNN). |
| 8 | products/{medical-device,quasi-drug,health-functional-food}/ | 제품군 확장 (스캐폴드). |
| 9 | services/{kpa,gp,kcos,neture}/ | 서비스별 채널·운영 특성 (Rule Registry 없음, CR/DR/AR 참조). |

---

## 2. 무엇부터 읽나 (역할별)

- **새 증상군/제품 batch 시작** → WORKFLOW → 해당 products/ Guide → CONTENT-CHECK-STANDARD.
- **규칙이 궁금** → RULE-REGISTRY(CR/DR/AR)에서 Rule ID로 찾기.
- **AI로 초안/요약/분류** → ai/ 전체.
- **서비스 채널 적용(약국 POP 등)** → services/{해당}/.
- **문서 체계 자체를 바꾸려면** → DOCUMENT-ARCHITECTURE (IR은 수정하지 않는다).

---

## 3. 절대 원칙 (한눈에)

- 하나의 규칙은 **한 곳**(SSOT)에만. 다른 문서는 Rule ID로 참조.
- **CHECK는 규칙을 설명하지 않는다** — 결과만.
- **WO는 작업 차이만** — 공통은 이 폴더 참조.
- **IR은 역사(불변)**, 운영·갱신은 DOCUMENT-ARCHITECTURE.
- 콘텐츠 작업은 **read-only 조사**, DB 반영은 승인·이중게이트 후에만.
