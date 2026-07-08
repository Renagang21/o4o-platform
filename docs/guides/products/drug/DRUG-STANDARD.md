# DRUG-STANDARD — 의약품 설명서 설계 표준 (운영)

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)
Rule: [DR-015](DRUG-RULE-REGISTRY.md) · [DR-016](DRUG-RULE-REGISTRY.md)

> 의약품 소비자 설명서의 **설계 철학**(상위). 공통 원칙은 [content-authoring](../../content-authoring/CONTENT-AUTHORING-PRINCIPLES.md)·[common/DOCUMENT-ARCHITECTURE](../../common/DOCUMENT-ARCHITECTURE.md) 참조.
>
> **상세 원문(전체 규칙 본문)**: [`docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md`](../../O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md) — 본 운영 문서가 그 운영 진입점이다(원문은 역사·상세 보존).

---

## 1. 3단계 구조 (DR-016)

```text
소비자 대표 설명 → 성분 canonical → 제품
```
- 소비자 진입 = 증상/약효군, canonical 승격 단위 = 성분·함량.
- 조성 확인되면 성분 canonical로 세분, 불가하면 대표 + HOLD_SOURCE(→ CR-007).
- 조성 추정(스테로이드/항생/항진균 종류·마취 포함 여부) 금지.

## 2. 대표 분리 4축 (DR-015)

하나라도 갈리면 별도 대표:
1. **투여경로** (좌약↔관장제 · 점안액↔안연고 · 먹는약↔바르는약↔코분무)
2. **작용기전** (자극성↔삼투성↔팽창성 하제 · 제산↔H2 · 장운동억제↔흡착)
3. **소비자 선택축** (1세대↔2세대 항히스타민 · 인공눈물↔충혈완화제 · 위장약↔소화제)
4. **안전성** (항생외용·H2·비충혈점비=검토강화 / 스테로이드·좌제·질정=수동 큐레이션)

함량축은 ①~④와 독립 적용(예: 펙소페나딘 60mg 1일2회 ↔ 120mg 1일1회).

## 3. HOLD_SOURCE 철학 (CR-007)

"만들지 못한 상태"가 아니라 "만드는 것이 안전하지 않은 상태". 추정으로 채우기보다 비워두는 것이 신뢰성 우선의 귀결.

## 4. 버전 정책

Minor(문장·예시·현황) = V1 유지 / Major(구조·규칙·철학) = WO 승인 후 V2 신규.
