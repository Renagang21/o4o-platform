# AI-GROUNDING

상태: Active · V1 (2026-07-08) · Rule: [AR-002](AI-RULE-REGISTRY.md) · 진입: [DOCUMENT-INDEX](../common/DOCUMENT-INDEX.md)

> AI가 근거 없이 만들어내지 않도록 하는 grounding 규칙. CR-004(Grounding 필수)의 AI 실행형.

## 원칙

- AI는 **원문 grounding 없이 성분·효능·수치·용법을 생성하지 않는다**(AR-002, 창작 0).
- 근거는 공식 원문(허가사항·e약은요 등)에서 온다(CR-002).
- 원문에 없는 값은 만들지 않고 "제품별 허가 내용 확인" 또는 HOLD로 처리(CR-007).
- 근거 문장을 출력에 추적 가능하게(source_ref) 남긴다.

## 금지

- 브랜드명으로 조성 추정 / 기억·일반 지식으로 성분·효능 보강 / 근거 없는 수치 생성.
