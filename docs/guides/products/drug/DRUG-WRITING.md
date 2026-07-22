# DRUG-WRITING — 의약품 소비자 설명서 작성 방법 (운영)

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)
Rule: [DR-008](DRUG-RULE-REGISTRY.md) · 공통: [CR-001~CR-006](../../common/CONTENT-RULE-REGISTRY.md)

> 의약품 설명서 작성 규칙(문체·민감 약효군·grounding·SOURCE GAP)의 운영 진입점.
>
> **상세 원문(§3.5~§3.11 전체 본문·요약표·예시)**: [`docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`](../../O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) — 본 문서가 그 운영 진입점(원문은 역사·상세 보존).

---

## 1. 공통 상속

소비자 중심(CR-001)·원문 우선(CR-002)·과장 금지(CR-003)·grounding 필수(CR-004)·혼동 방지(CR-005)·안전 안내(CR-006)는 [content-authoring 원칙](../../content-authoring/CONTENT-AUTHORING-PRINCIPLES.md)을 따른다.

## 2. 의약품 전용

- 제목 = **성분 + 함량 + 제형**(브랜드 제목 금지). 질환명·증상명 회피 금지.
- **민감 약효군 기본값 = 약사 검토 강화**(DR-008): 경구피임약·수면유도제·항혈전·질정·강한 NSAID·철분 등.
- **비경구 자동초안 0**: route별 사용법·금기 원문 확인 필수. 스테로이드 외용·항생 외용·좌제·질정·미백 = 수동 큐레이션.
- 원문 grounding 없이 성분·효능·수치 창작 금지(CR-004/AR-002).
- **기존 authored draft(선행 저작본) 부재는 HOLD 사유가 아니다** — 제품 고유의 공식 원문(효능·용법·주의)이 있으면 신규 저작으로 진행한다. HOLD는 공식 원문 자체 부재/확인불가일 때만(CR-007). 제품별 정보가 다르면 공통화하지 말고 subgroup 또는 제품별로 분리한다.
- **매장용 설명서의 방어적 작성 금지**: 약사 상주 매장 상담 보조용이므로, 주의·제한 중심으로 용도·구매 판단을 흐리지 않는다. 근거가 충분하면 질병명·허가 효능을 명확히 표시해 적극적으로 작성하고, 하단에 매장 내 전문가(약사) 문의 안내를 유지한다.

## 3. SOURCE GAP (CR-007)

효능·용법·주의가 수렴하면 대표 작성, 아니면 HOLD_SOURCE. 상세 게이트·4조건은 WRITING-GUIDE §3.11 원문 참조.
