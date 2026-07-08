# AI-RULE-REGISTRY (AR) — AI 전용 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../common/DOCUMENT-INDEX.md)

> 제품군·콘텐츠 유형과 독립인 **AI 규칙**. 콘텐츠 생성·번역·요약·분류·검수 AI가 공유한다. 다른 문서는 Rule ID(AR-NNN)로 참조.

---

| Rule ID | 요지 | SSOT 문서 | 상태 |
|---|---|---|---|
| **AR-001** | 프롬프트는 역할·입력·출력 형식을 명시한다 | ai/AI-PROMPT-STANDARD | active |
| **AR-002** | AI는 원문 grounding 없이 성분·효능·수치를 생성하지 않는다(창작 0) | ai/AI-GROUNDING | active |
| **AR-003** | AI 출력은 검수 단계를 거친다(자기검증 + 교차검증) | ai/AI-REVIEW | active |
| **AR-004** | 환각·과장·민감정보 노출 금지 | ai/AI-SAFETY | active |
| **AR-005** | O4O는 소비자 설명서 초안을 외부 LLM으로 자동 생성하지 않는다. AI는 **편집 보조·검수 보조·번역 보조**로 제한한다(초안 근거는 공식 원문) | ai/AI-SAFETY | active |
| **AR-006** | AI 출력은 사람/전문가 승인 전까지 배포 상태로 승격하지 않는다 | ai/AI-REVIEW · common/WORKFLOW | active |

> CR-004(Grounding 필수)의 AI 실행형이 AR-002다. 신규 AI 규칙은 AR-007부터 부여한다.
