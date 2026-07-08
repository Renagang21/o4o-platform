# DOCUMENT-ARCHITECTURE — O4O 콘텐츠 문서 체계 운영 매뉴얼

상태: Active Standard · V1 (2026-07-08)
근거(역사): [IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1](../IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1.md)
진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> **IR은 이 구조를 왜 정했는지(결정 근거)를 남기고 멈춘다. 본 문서가 그 구현체(운영 매뉴얼)로서 이후 운영·갱신을 담당한다.** 문서 체계를 바꾸려면 이 문서를 수정한다(IR은 수정하지 않는다).

---

## 1. 문서의 4가지 역할

| 문서 | 역할 | 한 단어 |
|---|---|---|
| **Guide** | 어떻게 만들 것인가 — 규칙·원칙의 원본(SoT) | 설계 |
| **CHECK** | 무엇을 적용·검증했는가 — 실행 결과·감사 근거 | 실행 결과 |
| **Registry** | 지금 어느 그룹이 어떤 상태인가 — 배치·승격 진행 상태 | 운영 상태 |
| **Memory** | 변하지 않는 결정 — 불변 원칙 | 불변 결정 |

하나의 정보는 자신의 역할 문서에만 존재한다.

## 2. 5축 구조

```text
guides/
  common/            문서 체계·WORKFLOW·CHECK·공통 규칙(CR)   ← 모든 축 상속
  content-authoring/ 콘텐츠 유형 공통 작성 원칙
  ai/                AI 규칙(AR)
  products/          제품군: drug(레퍼런스)·medical-device·quasi-drug·health-functional-food (DR)
  services/          서비스: kpa·gp·kcos·neture (registry 없음, CR/DR/AR 참조)
```

- `products/`(제품군)와 `services/`(서비스)는 **직교**한다. 같은 의약품이라도 서비스별 채널·운영이 다르므로 분리한다.
- 운영 상태 데이터(배치·상태머신)는 `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`로 규칙 문서와 분리 유지한다.

## 3. 기본 원칙

- **단일 위치(SSOT)**: 하나의 규칙은 한 곳에만. 다른 문서는 Rule ID로 참조.
- **CHECK는 규칙을 설명하지 않는다**: 적용·검증·결과만.
- **WO는 작업 차이만**: 공통 규칙은 common/ 참조.
- **Guide는 규칙의 원본**: 규칙은 Guide만 수정.
- **CLAUDE.md는 진입점**: 규칙 복사 금지, DOCUMENT-INDEX 포인터만.
- **MEMORY는 불변식만**: 배치 진행은 track memory.
- **공통 우선(common-first)**: 축에 걸쳐 같은 규칙은 common으로 올린다.

## 4. Rule Registry — 4계층 (CR / DR / AR / OR)

| 계층 | 파일 | 대상 |
|---|---|---|
| **CR** | common/CONTENT-RULE-REGISTRY.md | 콘텐츠 공통(소비자 중심·원문 우선·과장 금지·grounding·pipeline 등) |
| **DR** | products/drug/DRUG-RULE-REGISTRY.md | 의약품 전용(ATC·성분·함량·제형·복합·과병합 예외 등) |
| **AR** | ai/AI-RULE-REGISTRY.md | AI 전용(프롬프트·grounding·검수·안전) |
| **OR** | common/OPERATIONAL-RULE-REGISTRY.md | 운영/Git/문서 관리(운영 이관 헤더·대량 삭제 금지·force rewrite 금지·병렬 보호·이동보다 참조 우선·path-specific commit) |

- 정본 이력: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4`(R1~R62) + `CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1 §10`(OR/KB 분리).
- 서비스는 자체 registry를 만들지 않고 CR/DR/AR/OR를 Rule ID로 참조한다.
- 신규/변경 규칙: 공통=CR, 제품군=DR, AI=AR, 운영=OR로 ID 부여 + 해당 Guide 본문 수정.

### 4-1. Knowledge Catalog (Rule 아님)

규칙이 아니라 **사례·패턴이 계속 축적되는 지식**은 Registry가 아닌 별도 카탈로그로 둔다(Registry 비대화 방지). 규칙 문장은 Registry에 두고, 실증 사례는 카탈로그를 참조한다.

| 카탈로그 | 위치 | 내용 |
|---|---|---|
| ATC 오탐 카탈로그 | products/drug/knowledge/ATC-FALSE-POSITIVE-CATALOG.md | ATC 내 경구/타경로 혼입 실사례(R01B·R02A·S01…) |
| 그룹핑 패턴 | products/drug/knowledge/GROUPING-PATTERNS.md | 함량축 분할 등 반복 패턴(펙소페나딘 60/120…) |

> OR 계층과 Knowledge Catalog 실체화는 `WO-O4O-CONTENT-RULES-DELTA-APPLY-V1`에서 수행한다(본 표는 go-forward 구조 확정).

## 5. 참조 관계

```text
CLAUDE.md ─▶ common/DOCUMENT-INDEX ─▶ Guide(common·content-authoring·ai·products·services)
                                        ─▶ WO ─▶ CHECK ─▶ Registry(운영상태) · Track Memory
```

## 6. 운영 규칙

- 새 규칙 → CHECK가 아니라 Guide 수정 + Rule Registry(CR/DR/AR) ID 등재.
- 규칙 변경 시 Guide 한 곳만 수정하면 전 축에 반영.
- 새 제품군/서비스/콘텐츠 유형 추가 = common 상속 + 자체 문서만 작성(서비스는 registry 없음).
- 기존 흩어진 문서(WRITING-GUIDE·CANONICAL-STANDARD·rule CHECK)는 **역사로 보존**하되, 신규 참조는 본 체계(products/drug/*, common/*)를 사용한다.

## 7. 변경 이력

- V1 (2026-07-08): IR §2~§13 승격. `WO-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1`로 최초 구현.
