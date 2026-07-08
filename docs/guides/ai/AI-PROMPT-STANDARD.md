# AI-PROMPT-STANDARD

상태: Active · V1 (2026-07-08) · Rule: [AR-001](AI-RULE-REGISTRY.md) · 진입: [DOCUMENT-INDEX](../common/DOCUMENT-INDEX.md)

> O4O에서 AI(생성·번역·요약·분류·검수)를 부를 때의 프롬프트 표준.

## 원칙

- 프롬프트는 **역할 · 입력 · 출력 형식**을 명시한다(AR-001).
- 근거 자료(원문)를 프롬프트에 함께 주입한다(→ [AI-GROUNDING](AI-GROUNDING.md), AR-002).
- 출력은 구조화(스키마/필드)하여 검수·후처리가 가능하게 한다.
- 금지·안전 제약을 프롬프트에 포함한다(→ [AI-SAFETY](AI-SAFETY.md), AR-004).

## 최소 구조

```text
[역할] 무엇을 하는 AI인가 (예: 의약품 소비자 설명서 편집 보조)
[입력] 근거 원문 + 대상 데이터
[작업] 정확히 무엇을 산출하는가
[제약] grounding 필수 · 창작 금지 · 안전 규칙
[출력] 형식(필드/스키마)
```

> 상세 규칙은 확장 시 본 문서에 추가하고 AR에 ID를 등재한다.
