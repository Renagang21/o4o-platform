# DRUG-GROUPING — 의약품 대표 설명서 공유·group_key 규칙 (운영)

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)
Rule: [DR-001~DR-007, DR-010~DR-014](DRUG-RULE-REGISTRY.md)

> group_key·정규화·복합제·과병합 예외의 운영 진입점.
>
> **상세 원문**: registry 표준 = [`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`](../../../registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md) §2 · 규칙 확립 이력 = `CHECK-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1` · `...-GROUPING-DICTIONARY-SEED-V1` · `...-COMBINATION-GROUPING-RULE-V1` · `...-HIGH-RISK-GROUP-CURATION-V1` · `...-ROUTE-TEMPLATE-V1`.

---

## 1. ATC는 후보 검색용 (DR-001)

ATC는 후보를 찾는 데만 쓰고 **설명서 그룹핑 기준으로 쓰지 않는다.** ATC는 route/제형을 인코딩하지 않아 오탐이 크다(확정 함정: `R01B`·`R02A`(경구 감기약)·`S01`(눈영양 경구캡슐)). route/제형은 name 키워드(1차) + ATC 교차(2차) + spec으로 확정.

## 2. 공유/분리 (DR-002~DR-005)

- 공유 = **성분 + 함량 + 제형 + 투여경로 + 허가 효능/용법** 동일(DR-004).
- **route 다르면 분리**(DR-002), **제형 다르면 분리**(DR-003), **함량이 OTC/RX·용법 가르면 분리**(DR-005).
- 포장·바코드·용기용량·개수·파스 매수 = 분리 기준 아님.

## 3. group_key (DR-010)

```text
drug_otc::{single|combo}::{route}::{ingredient}::{strength}::{form}
```
strength = 농도/함량만(spec 첫 토큰은 용기 용량 ≠ 농도, DR-012). ingredient는 표기변형 정규화 후(DR-011).

## 4. 복합제 (DR-006, DR-014)

- 탐지 = ATC 조합코드(`substr(atc,6,2)≥50` or `R05X`). **name 키워드 게이트 금지**(진짜 복합제 95% 탈락).
- group_key ingredient = 조합 ATC 슬러그 + `_combo`. **R05X 감기약 catch-all = `blocked`(no_merge).**
- 복합제 기본 = 약사 검토 강화(자동초안 0).

## 5. 과병합 예외 (DR-007)

ATC7이 서로 다른 실제 성분을 묶는 경우 성분별 분리: **인공눈물 S01XA20** · **정장 생균 A07FA**.

## 6. 노이즈 필터 (DR-013)

후보 산출 1차 배제: 수출·군납·비매·수출명·해외.
