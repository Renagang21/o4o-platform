# CHECK-O4O-DRUG-OTC-DESCRIPTION-WRITING-GUIDE-SOURCE-GAP-RULE-UPDATE-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-WRITING-GUIDE-SOURCE-GAP-RULE-UPDATE-V1`

이번 CHECK는 **설명서 작성 가이드 문서 보강만** 수행한 결과다. DB write·코드 변경·설명서 신규 작성·ETL 구현·MFDS API 호출은 하지 않았다.

## 2. 목적

Probiotic(A07FA)·해열진통 복합제(N02BE51)·소화효소 복합제(A09A) 세 트랙에서 반복 확인된 공통 병목 — 원료·분량(조성) 정보가 e약은요·ProductDrugExtension·ProductMaster name·ATC 어디에도 없어 세분 설명서를 만들 수 없는 상태 — 를 **SOURCE GAP**으로 공식 정의하고, 앞으로 모든 OTC 설명서 제작에 적용할 처리 규칙을 가이드에 고정한다.

## 3. 수정한 가이드 위치

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md
```

| 위치 | 변경 |
|---|---|
| §3.11 (신설) | SOURCE GAP — 조성 원천 부재 그룹 처리 (§3.11.1~§3.11.8) |
| §9 업데이트 규칙 | "조성 원천 부재로 세분 불가 그룹 발견 → SOURCE GAP 사례 추가·HOLD_SOURCE 분류" 행 추가 |

## 4. 추가한 규칙 요약

- **§3.11.1 정의**: e약은요 원료·분량 없음 + ProductDrugExtension 성분 NULL + ProductMaster 이름 판별 불가 + ATC 분리 불가 = **모두 만족 시 SOURCE GAP**.
- **§3.11.2 기본 원칙**: 조성을 추정하지 않는다. 브랜드명 추정·기억 기반 조성·근거 없는 제조사 홈페이지·AI 추론 성분 생성·성분 창작 금지. (§3.8 저 grounding 금지의 복합제 확장)
- **§3.11.3 작성 규칙**: SOURCE GAP이면 허가 효능·용법이 수렴하는 범위까지 **대표 설명서만** 작성 (종합감기약 / 해열·진통 복합제 / 소화효소 복합제 / 단일균 설명서).
- **§3.11.4 HOLD_SOURCE**: 조성 구분이 필요한데 원천이 없으면 HOLD_SOURCE 분류. 브랜드별·조성별·세분 설명서, 조성 signature, group_key 세분화 금지.
- **§3.11.5 ETL 분리 원칙**: SOURCE GAP은 현재 설명서 프로젝트에서 해결하지 않고 후속 `MFDS 허가 원료·분량 ETL`에서 일괄 해결. (설명서 → HOLD_SOURCE → 후속 ETL → 세분화)
- **§3.11.6 사례 3건**: Case 1 A07FA51(균주 조성 없음), Case 2 N02BE51(카페인·IPA·에텐자미드 구분 불가), Case 3 A09A(UDCA·담즙·시메티콘·건위생약 구분 불가).
- **§3.11.7 적용 대상**: 위장약·지사제·변비약·피부질환·순환기·비뇨기·안과 OTC·기타 복합제.
- **§3.11.8 흐름 변경**: "설명서 작성 → SOURCE GAP 사후 조사" → "조성 확인 → 가능(세분)/불가능(대표+HOLD_SOURCE)" 선행 분기.

## 5. 기존 WO/CHECK와의 정합성

| 근거 문서 | SOURCE GAP 사례 |
|---|---|
| `CHECK-O4O-DRUG-OTC-DESCRIPTION-PROBIOTIC-STRAIN-GROUPING-AND-DRAFT-STANDARD-V1` | A07FA51 다균주 균주 조성 DB 부재 → 단일균 대표만, 다균주 defer |
| `CHECK-O4O-DRUG-OTC-DESCRIPTION-ANALGESIC-ANTIPYRETIC-COMBO-DRAFT-V1` | N02BE51 카페인·IPA·에텐자미드 조성 세분 불가 |
| `CHECK-O4O-DRUG-OTC-DESCRIPTION-DIGESTIVE-COMBO-DRAFT-V1` | A09A 소화효소 복합 조성 name·pde·원문 어디로도 판별 불가(신호 0/538) |

- §3.11.2는 기존 §3.8(저 grounding 금지) 원칙을 복합제로 확장한 것으로, 상충 없음.
- §3.11.3의 대표 설명서 접근은 위 3개 CHECK의 "대표 초안만 작성" 결론과 일치.
- ProductDrugExtension 성분 필드 OTC 전량 NULL은 §3.6·§3.10 및 위 CHECK들에서 반복 실측된 사실.

## 6. 앞으로 적용되는 트랙

위장약 · 지사제 · 변비약 · 피부질환 OTC · 순환기 OTC · 비뇨기 OTC · 안과 OTC · 기타 복합제 — 조성 확인 가능하면 세분, 불가하면 대표 설명서 + HOLD_SOURCE.

## 7. 변경 없음 확인

- 코드 변경 없음
- DB write 0 (SELECT 포함 DB 접근 없음)
- ETL 구현 없음
- 설명서 신규 작성 없음
- MFDS API 호출 없음
- ProductMaster / ProductCandidate 변경 없음
- 변경 파일: 가이드 1건 + 본 CHECK 1건 (문서만)

## 8. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 설명서 작성 가이드 수정 | ✅ §3.11 신설, §9 보강 |
| SOURCE GAP 정의 추가 | ✅ §3.11.1 |
| 대표 설명서 원칙 추가 | ✅ §3.11.3 |
| HOLD_SOURCE 규칙 추가 | ✅ §3.11.4 |
| ETL 분리 원칙 추가 | ✅ §3.11.5 |
| 실제 사례 3건 추가 | ✅ §3.11.6 (A07FA51·N02BE51·A09A) |
| CHECK 문서 작성 | ✅ 본 문서 |
| DB write 0 | ✅ |
| 코드 변경 없음(문서만) | ✅ |
