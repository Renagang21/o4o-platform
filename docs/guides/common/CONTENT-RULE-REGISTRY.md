# CONTENT-RULE-REGISTRY (CR) — 콘텐츠 공통 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> 제품군·서비스·콘텐츠 유형에 걸쳐 성립하는 **공통 규칙**. 다른 문서는 Rule ID(CR-NNN)로만 참조한다.
> 제품군 전용은 [DR](../products/drug/DRUG-RULE-REGISTRY.md), AI 전용은 [AR](../ai/AI-RULE-REGISTRY.md), 운영/Git/문서 관리는 [OR](OPERATIONAL-RULE-REGISTRY.md).
> 정본 이력: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4` (R1~R62).

---

| Rule ID | 요지 | SSOT 문서 | 상태 |
|---|---|---|---|
| **CR-001** | 소비자 중심 · 목적 우선순위(선택 > 안전 > 상담 > 정보). 성분 설명 자체가 목적 아님 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-002** | 공식 원문(허가사항·e약은요 등) 우선 — 기억·AI·인터넷·홍보는 열위 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-003** | 과장·우월성 단정 금지("더 좋다/부작용 없다/빨리 낫는다" 등). **최상급은 대상 전수 비교 근거 없이 금지**, **그룹 공통 사항을 그 제품만의 장점처럼 배치 금지**(허위 차별화) — 실패 유형 ③④ | content-authoring/CONTENT-AUTHORING-PRINCIPLES §3·§4-1 | active |
| **CR-004** | Grounding 필수 — 원문 근거 없으면 확장·창작 금지. **원문에 없는 것은 "근거 없음"이지 "허용"이 아니다**(제약의 부재 ≠ 자유의 근거) — 실패 유형 ①⑤ | content-authoring/CONTENT-AUTHORING-PRINCIPLES §4·§4-1 | active |
| **CR-005** | 소비자 오해·혼동 방지 — 사용 맥락(경로·형태)이 다르면 분리 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-006** | 안전성 안내 필수 — 전문가/진료 연결 기준 명시 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-007** | 원천 부재 시 추정 금지 → HOLD (SOURCE GAP 일반형; "안전 판단"이지 실패 아님). **근거 부족 제품은 제작하지 않음** — 제품명·분류 불명확 또는 고유 원료·함량·기능성·사용법 등 핵심 근거 미확인 시 미작성·보류(유사/다른 제품으로 대체 금지, 보수적 추정 설명서 금지). 전 상품군 공통 | WORKFLOW · content-authoring | active |
| **CR-008** | 작업은 read-only 조사, DB 반영은 승인·이중게이트 후에만 | WORKFLOW §4 | active |
| **CR-009** | Pipeline: 작성→검토→승인→배포. canonical 승격은 항상 별도 승인 | WORKFLOW | active |
| **CR-010** | Registry = 문서(운영 상태), 상태 변경 중앙 전용 | WORKFLOW §4 · registries/* | active |
| **CR-011** | CHECK = 결과만 기록(규칙 미반복, Rule ID 참조). **신규 규칙은 CHECK가 아니라 Guide/Registry에 등재** | CONTENT-CHECK-STANDARD · DOCUMENT-ARCHITECTURE §6 | active |
| **CR-012** | WO = 작업 차이만(대상·제외·bucket·키워드·주의문구·우선순위·후속) | DOCUMENT-ARCHITECTURE §3 | active |
| **CR-013** | 하단 공통 신뢰 문구 등 콘텐츠 유형별 필수 블록 유지 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-014** | DB 비밀정보 비기록(env에서만 추출, 문서/커밋 미기록) | WORKFLOW §6 | active |
| **CR-015** | IR=역사(불변) / DOCUMENT-ARCHITECTURE=운영. 문서 체계 운영·갱신은 ARCHITECTURE가 담당 | DOCUMENT-ARCHITECTURE §1-1 | active |
| **CR-016** | 결정 계보: IR(회의·논의·반려·후보) → ADR(채택 결정만) → Guide(운영). ADR 소급 변환 금지, 새 결정부터 기록 | DOCUMENT-ARCHITECTURE §1-2 · docs/adr/ | active |
| **CR-017** | 문서 4역할: Guide=설계 / CHECK=실행 결과 / Registry=운영 상태 / Memory=불변 결정 | DOCUMENT-ARCHITECTURE §1 | active |
| **CR-018** | DOCUMENT-INDEX = 단일 진입점(새 합류자는 여기부터). CLAUDE.md는 규칙 복사 없이 INDEX 포인터만 | DOCUMENT-INDEX · CLAUDE.md | active |
| **CR-019** | products·services 축은 직교. 서비스는 자체 Rule Registry 없이 CR/DR/AR/OR를 Rule ID로 참조 | DOCUMENT-ARCHITECTURE §2 · services/*/README | active |

> 신규 공통 규칙은 CR-020부터 부여하고 해당 SSOT Guide 본문을 함께 수정한다. 운영/Git/문서 관리 규칙은 CR이 아니라 [OR](OPERATIONAL-RULE-REGISTRY.md)에 등재한다.
