# CHECK — 신규 완결형 생산 1차 배치 (Agent B) — 비타민D+아연+칼슘 40 · 비타민A+비타민E 31

- 방식: **신규 완결형** — 한 에이전트가 조사→KO/EN 설명서·디자인→DB 반영·검증·commit·push 까지 완결. (기존 A/B/C 분업 종료 후 첫 배치)
- 기준 파서 commit: `09d5e50c3` (5-gap 보강). 기준선 복합형 LIVE **605**.
- 정본 후보: 파서 보강 회귀에서 확정된 D+Zn+Ca **40** · A+E **31** (= 71).

## 1. 대상·풀

| 그룹 | slug | ELIGIBLE | 원료집합(유일) | 제형 |
|------|------|:---:|------|------|
| 비타민D+아연+칼슘 | `new-combo-vd-zn-ca` | 40 | 비타민D+아연+칼슘 | gummy 17·chewable 17·tablet 4·powder 2 |
| 비타민A+비타민E | `new-combo-va-ve` | 31 | 비타민A+비타민E | softgel 29·gummy 1·capsule 1 |

- HOLD∩target 0 · 유일 statementNo 40/31 · 신규 원료/basis/제형 0.

## 2. 생성·Guard

| 그룹 | 작성 | PASS | REVIEW | BLOCKED | G-MULTI HOLD |
|------|:---:|:---:|:---:|:---:|:---:|
| D+Zn+Ca | 40 | 38 | 2(코팅 known-safe) | 0 | 0 |
| A+E | 31 | 31 | 0 | 0 | 0 |

- KO/EN + 디자인(sd-*) draft 각 제품 2종(총 142 파일).
- **REVIEW_LATER 0** (근거 불명확 개별 제외 0).

### 부수 Guard 보강 — G-MULTI SRC_LABEL 베타카로틴 인식

- A+E 초회 generate 에서 3건(`대연베타카로틴`·`베이비앤키즈 눈건강 구미`·`눈엔베타카로틴`)이 `G-MULTI-AMOUNT-SOURCE` "비타민A 라벨 원문 미검출" 오탐.
- 원인: 원문 라벨이 **`베타카로틴`(provitamin A)** 인데 `SRC_LABEL['비타민A']=/비타민\s?A/` 가 미인식. select CLS 는 `/비타민\s?A\b|레티놀|베타카로/` 로 이미 인식(불일치).
- 수정: `SRC_LABEL['비타민A']` 를 CLS 와 정합(`/비타민\s?A\b|레티놀|베타카로/`) → 3건 정당 복구, 31/31 통과. (B1⊆B12 수정과 동류)
- 회귀: single-lutein rederive `changedVsQueue 0`(21/8/2 유지) — 베타카로 추가 무영향.

## 3. dry-run → apply → 독립검증

| 항목 | D+Zn+Ca | A+E | 계 |
|------|:---:|:---:|:---:|
| target | 40 | 31 | 71 |
| candidate missing/ambiguous | 0/0 | 0/0 | 0 |
| 사전승격 / masterDup / canonicalSpdDup | 0/0/0 | 0/0/0 | 0 |
| 예상=실측 write | 160 | 124 | **284** |
| postVerifyPass | ✅ | ✅ | — |
| 독립검증 appliedProducts | 40 | 31 | 71 |
| canonicalDup / candidateLinks / spdRefLinks | 0 / 40 / 80 | 0 / 31 / 62 | 0 / 71 / 142 |

- write 계약 = 제품당 4 (ProductMaster 1 + candidate UPDATE 1 + STORE SPD ko 1 + en 1) → 71×4 = **284**.
- tag `batch:single-nutrient-new-combo-vd-zn-ca` · `...-va-ve`. rollback manifest 2종 저장.
- verifier `COMBO_NONPREFIXED_TAGS` 에 두 slug 추가 → **totalComboLive 676** (existingTotal 645 + 31), 직접 집계 일치.

## 4. 결과

- **복합형 LIVE 605 → 676** (+71). 기존 LIVE drift 0 · canonicalDup 0.
- **속도(신규 방식 1차)**: 시작 2026-07-22 10:13:53 KST → 종료 10:26:25 KST ≈ **12.5분 / 71건** (≈ 340/시간). 단, select ELIGIBLE 풀은 파서 회귀 단계에서 선산출분 재사용 — 순수 select 시간 제외한 generate→apply 구간 측정치.

*정본 파서 09d5e50c3 · apply 사용자 승인 · 독립검증 read-only(DB write 0) · path-specific commit.*
