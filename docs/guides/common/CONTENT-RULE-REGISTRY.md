# CONTENT-RULE-REGISTRY (CR) — 콘텐츠 공통 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> 제품군·서비스·콘텐츠 유형에 걸쳐 성립하는 **공통 규칙**. 다른 문서는 Rule ID(CR-NNN)로만 참조한다.
> 제품군 전용은 [DR](../products/drug/DRUG-RULE-REGISTRY.md), AI 전용은 [AR](../ai/AI-RULE-REGISTRY.md).
> 정본 이력: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1 §4` (R1~R62).

---

| Rule ID | 요지 | SSOT 문서 | 상태 |
|---|---|---|---|
| **CR-001** | 소비자 중심 · 목적 우선순위(선택 > 안전 > 상담 > 정보). 성분 설명 자체가 목적 아님 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-002** | 공식 원문(허가사항·e약은요 등) 우선 — 기억·AI·인터넷·홍보는 열위 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-003** | 과장·우월성 단정 금지("더 좋다/부작용 없다/빨리 낫는다" 등) | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-004** | Grounding 필수 — 원문 근거 없으면 확장·창작 금지 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-005** | 소비자 오해·혼동 방지 — 사용 맥락(경로·형태)이 다르면 분리 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-006** | 안전성 안내 필수 — 전문가/진료 연결 기준 명시 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-007** | 원천 부재 시 추정 금지 → HOLD (SOURCE GAP 일반형; "안전 판단"이지 실패 아님) | WORKFLOW · content-authoring | active |
| **CR-008** | 작업은 read-only 조사, DB 반영은 승인·이중게이트 후에만 | WORKFLOW §4 | active |
| **CR-009** | Pipeline: 작성→검토→승인→배포. canonical 승격은 항상 별도 승인 | WORKFLOW | active |
| **CR-010** | Registry = 문서(운영 상태), 상태 변경 중앙 전용 | WORKFLOW §4 · registries/* | active |
| **CR-011** | CHECK = 결과만 기록(규칙 미반복, Rule ID 참조) | CONTENT-CHECK-STANDARD | active |
| **CR-012** | WO = 작업 차이만(대상·제외·bucket·키워드·주의문구·우선순위·후속) | DOCUMENT-ARCHITECTURE §3 | active |
| **CR-013** | 하단 공통 신뢰 문구 등 콘텐츠 유형별 필수 블록 유지 | content-authoring/CONTENT-AUTHORING-PRINCIPLES | active |
| **CR-014** | DB 비밀정보 비기록(env에서만 추출, 문서/커밋 미기록) | WORKFLOW §6 | active |

> 신규 공통 규칙은 CR-015부터 부여하고 해당 SSOT Guide 본문을 함께 수정한다.
